/* hooks/useGroups.js */

import { useState, useCallback } from 'react';

export const useGroups = (orgId) => {
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getToken = () => localStorage.getItem("access_token");

  const fetchGroups = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${orgId}/groups/`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        let data = await res.json();
        data = data.filter(g => g.category !== 'meeting');
        data = data.map(g => ({
          ...g,
          organization_id: g.organization?.organization_id || g.organization_id || orgId,
        }));
        setGroups(data);
      }
    } catch (e) {
      console.error("Fetch groups error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  const fetchAllUsers = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${orgId}/users/`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setAllUsers(await res.json());
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    }
  }, [orgId]);

  const createGroup = async (formData) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/identity/groups/add/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ ...formData, organization_id: orgId })
    });
    if (!res.ok) throw new Error("Błąd tworzenia grupy");
    await fetchGroups();
    return true;
  };

  const deleteGroup = async (groupId) => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/identity/groups/delete/${groupId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok && res.status !== 204) throw new Error("Błąd usuwania grupy");
    await fetchGroups();
    return true;
  };

  return {
    groups,
    allUsers,
    isLoading,
    fetchGroups,
    fetchAllUsers,
    createGroup,
    deleteGroup
  };
};