/* hooks/useTags.js */

import { useState, useCallback } from 'react';

export const useTags = (orgId) => {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const getToken = () => localStorage.getItem("access_token");

  const fetchTags = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/tags/`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) setTags(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTag = async (data) => {
    const res = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ tag_name: data.tag_name, organization: orgId })
    });
    if (!res.ok) throw new Error("Błąd tworzenia cechy");
    await fetchTags();
  };

  const updateTag = async (tagId, data) => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/tags/${tagId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Błąd edycji cechy");
    await fetchTags();
  };

  const deleteTag = async (tagId) => {
    const res = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/tags/${tagId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!res.ok && res.status !== 204) throw new Error("Błąd usuwania cechy");
    await fetchTags();
  };

  return { tags, isLoading, fetchTags, createTag, updateTag, deleteTag };
};