/* hooks/useGroupMembers.js */

import { useState, useCallback } from 'react';

export const useGroupMembers = (allUsers) => {
  const [groupMembers, setGroupMembers] = useState([]);

  const getToken = () => localStorage.getItem("access_token");

  const fetchGroupMembers = useCallback(async (groupId) => {
    if (!allUsers.length || !groupId) {
      setGroupMembers([]);
      return;
    }
    const token = getToken();
    const members = [];
    
    const promises = allUsers.map(async (user) => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/identity/users/${user.id}/groups/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const userGroups = await res.json();
          if (userGroups.some(g => g.group_id === groupId)) members.push(user);
        }
      } catch (e) { /* ignore error */ }
    });

    await Promise.all(promises);
    setGroupMembers(members);
  }, [allUsers]);

  const addMember = async (userId, groupId) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ user: userId, group: groupId })
    });
    
    if (res.ok) {
      const user = allUsers.find(u => u.id === parseInt(userId));
      if (user) setGroupMembers(prev => [...prev, user]);
      return true;
    }
    throw new Error("Błąd dodawania użytkownika");
  };

  const removeMember = async (userId, groupId) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/delete/', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ user: userId, group: groupId })
    });

    if (res.ok) {
      setGroupMembers(prev => prev.filter(u => u.id !== userId));
      return true;
    }
    throw new Error("Błąd usuwania użytkownika");
  };

  return { groupMembers, setGroupMembers, fetchGroupMembers, addMember, removeMember };
};