/* frontend/hooks/useUserData.js */

import { useState, useCallback } from 'react';

export const useUserData = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return { 
      'Content-Type': 'application/json', 
      Authorization: `Bearer ${token}` 
    };
  };

  const getOrgId = () => localStorage.getItem("org_id");

  const fetchUsers = useCallback(async () => {
    const org_id = getOrgId();
    if (!org_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/users/`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        let data = await response.json();
        data = data.map(u => {
          const parsedWeight = parseInt(u.weight);
          return {
            ...u,
            id: u.id ?? u.user_id ?? u.userId ?? null,
            weight: Number.isFinite(parsedWeight) ? parsedWeight : 5
          };
        });
        setUsers(data);
      } else {
         const errorText = await response.text();
         console.error(`Error fetching users: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    const org_id = getOrgId();
    if (!org_id) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/groups/`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        let data = await response.json();
        // normalize group id field and filter
        data = data.map(g => ({ ...g, group_id: g.group_id ?? g.id ?? g.groupId }));
        const filtered = data.filter(g => g.category !== 'meeting');
        setGroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, []);

  const fetchUserGroups = async (user_id) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${user_id}/groups/`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        let data = await response.json();
        data = data.map(g => ({ ...g, group_id: g.group_id ?? g.id ?? g.groupId }));
        return data.filter(g => g.category !== 'meeting');
      }
      return [];
    } catch (error) {
      console.error("Error fetching user groups:", error);
      return [];
    }
  };

  const createUser = async (userData, selectedGroups) => {
    const org_id = getOrgId();
    if (!org_id) return { success: false, message: "Brak ID organizacji." };

    try {
      const payload = { ...userData, organization: org_id };
      
      const response = await fetch(
        'http://127.0.0.1:8000/api/v1/identity/users/create/random/',
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const createdUser = data.user ?? data;

        if (userData.role === "participant" && selectedGroups.length > 0) {
          for (const group of selectedGroups) {
            await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ user: createdUser.id, group: group.group_id })
            });
          }
        }

        await fetchUsers();
        return { success: true, message: `Dodano użytkownika: ${userData.first_name} ${userData.last_name}` };
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        return { success: false, message: errorData.detail || `Błąd tworzenia użytkownika (Status: ${response.status})` };
      }
    } catch (error) {
      return { success: false, message: "Błąd sieciowy podczas tworzenia użytkownika" };
    }
  };

  const updateUser = async (userId, userData, originalGroups, newGroups) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${userId}/update/`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(userData)
        }
      );

      if (response.ok) {
        if (userData.role === "participant") {
          const currentGroupIds = originalGroups.map(g => g.group_id);
          const newGroupIds = newGroups.map(g => g.group_id);

          // Remove groups
          for (const group of originalGroups) {
            if (!newGroupIds.includes(group.group_id)) {
              await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/delete/', {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ user: userId, group: group.group_id })
              });
            }
          }

          // Add groups
          for (const group of newGroups) {
            if (!currentGroupIds.includes(group.group_id)) {
              await fetch('http://127.0.0.1:8000/api/v1/identity/user-groups/add/', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ user: userId, group: group.group_id })
              });
            }
          }
        }

        await fetchUsers();
        return { success: true, message: "Użytkownik zaktualizowany" };
      } else {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        return { success: false, message: errorData.detail || `Błąd aktualizacji (Status: ${response.status})` };
      }
    } catch (error) {
      return { success: false, message: "Błąd sieciowy podczas aktualizacji użytkownika" };
    }
  };

  const deleteUser = async (userId) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/identity/users/${userId}/remove_from_organization/`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        await fetchUsers();
        return { success: true, message: "Użytkownik usunięty" };
      } else {
        const errorText = await response.text();
        return { success: false, message: `Błąd usuwania (Status: ${response.status}): ${errorText}` };
      }
    } catch (error) {
      return { success: false, message: "Błąd sieciowy podczas usuwania użytkownika" };
    }
  };

  return {
    users,
    groups,
    fetchUsers,
    fetchGroups,
    fetchUserGroups,
    createUser,
    updateUser,
    deleteUser
  };
};