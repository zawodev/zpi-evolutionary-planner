/* pages/admin/recruitments.js */

import React, { useState, useEffect } from 'react';
import MsgModal from '@/components/admin/NotificationModal';
import ConfirmModal from '@/components/admin/ConfirmationModal';

const RecruitmentsPage = () => {
  // ===== NAVIGATION STATE =====
  const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'edit'
  const [selectedRecruitment, setSelectedRecruitment] = useState(null);

  // ===== INTERNAL TABS STATE (for create/edit) =====
  const [activeTab, setActiveTab] = useState('recruitment'); // 'recruitment', 'subjects'
  const [subjectMode, setSubjectMode] = useState('list'); // 'list', 'add', 'edit'

  // ===== DATA STATE =====
  const [recruitments, setRecruitments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [prevSubjects, setPrevSubjects] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);

  // ===== FORM STATE - RECRUITMENT =====
  const [recruitmentName, setRecruitmentName] = useState("");
  const [dayStartTime, setDayStartTime] = useState("08:00");
  const [dayEndTime, setDayEndTime] = useState("16:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [prefDate, setPrefDate] = useState("");
  const [prefDateEnd, setPrefDateEnd] = useState("");
  const [cycleType, setCycleType] = useState("weekly");
  const [planStatus, setPlanStatus] = useState("draft");
  const [defaultTokenCount, setDefaultTokenCount] = useState(40);
  const [roundBreakLength, setRoundBreakLength] = useState(10);
  const [recGroups, setRecGroups] = useState([]);

  // ===== FORM STATE - SUBJECT =====
  const [subName, setSubName] = useState("");
  const [capacity, setCapacity] = useState(30);
  const [duration, setDuration] = useState(30);
  const [minParp, setParp] = useState(5);
  const [breakB, setBreakB] = useState(0);
  const [breakA, setBreakA] = useState(15);
  const [subTags, setSubTags] = useState([]);
  const [subTeachers, setTeachers] = useState([]);
  const [subGroups, setSubGroups] = useState([]);
  const [editIndex, setEditIndex] = useState("");

  // ===== MODAL STATE =====
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // ===== UTILITY FUNCTIONS =====
  const openModal = (text) => {
    setModalMessage(text);
    setIsModalOpen(true);
  };

  const openConfirmModal = (text, action) => {
    setModalMessage(text);
    setConfirmAction(() => action);
    setIsConfirmModalOpen(true);
  };

  const clearRecruitmentForm = () => {
    // Uwaga: nie resetujemy subjects i recGroups, ponieważ są ładowane do edycji
    setRecruitmentName("");
    setDayStartTime("08:00");
    setDayEndTime("16:00");
    setStartDate("");
    setEndDate("");
    setPrefDate("");
    setPrefDateEnd("");
    setCycleType("weekly");
    setPlanStatus("draft");
    setDefaultTokenCount(40);
    setRoundBreakLength(10);
    setActiveTab('recruitment');
    setSubjectMode('list');
    setSelectedRecruitment(null); // Ważne dla powrotu do trybu "create"
    setSubjects([]); // Resetuj, jeśli nie jest w trybie edycji
    setRecGroups([]); // Resetuj, jeśli nie jest w trybie edycji
  };

  const clearRecruitmentFormForEdit = () => {
    // Używane do czyszczenia głównej części formularza, ale pozostawienia subjects/groups
    setRecruitmentName("");
    setDayStartTime("08:00");
    setDayEndTime("16:00");
    setStartDate("");
    setEndDate("");
    setPrefDate("");
    setPrefDateEnd("");
    setCycleType("weekly");
    setPlanStatus("draft");
    setDefaultTokenCount(40);
    setRoundBreakLength(10);
    setActiveTab('recruitment');
    setSubjectMode('list');
    setSubjects([]);
  }

  const clearSubjectForm = () => {
    setSubName("");
    setCapacity(30);
    setDuration(30);
    setParp(5);
    setBreakB(0);
    setBreakA(15);
    setSubTags([]);
    setTeachers([]);
    setSubGroups([]);
    setEditIndex("");
    setSubjectMode('list');
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      if (isNaN(date)) return isoString.split('T')[0] || 'N/A';
      return date.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return isoString.split('T')[0] || 'N/A';
    }
  };

  const formatTime = (timeString) => {
    return timeString ? timeString.substring(0, 5) : 'N/A';
  };


  // ===== API CALLS =====
  const fetchHostsForSub = async (sub_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/subjects/${sub_id}/groups/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();

        const results = data.map(d => {
          return hosts.find(h => h.id === d.host_user) || null;
        });

        return results;

      }
    } catch (error) {
      console.error("Error fetching recruitments:", error);
    }
  };
  const fetchTagsForSub = async (sub_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/subjects/${sub_id}/tags/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error fetching hosts:", error);
    }
  };
  const fetchGroupsForSub = async (sub_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/user-subjects/bulk_add_group/linked_groups/${sub_id}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error("Error fetching recruitments:", error);
    }
  };
  const fetchSubjectsForRec = async (rec_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/recruitments/${rec_id}/subjects/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();

        const subjectPromises = data.map(async (sub) => {
          const [tags, hosts, groups] = await Promise.all([
            fetchTagsForSub(sub.subject_id),
            fetchHostsForSub(sub.subject_id),
            fetchGroupsForSub(sub.subject_id),
          ]);

          return {
            subject_id: sub.subject_id,
            subject_name: sub.subject_name,
            capacity: sub.capacity,
            duration: Number(sub.duration_blocks) * 15,
            tags,
            min_students: sub.min_students,
            hosts,
            break_before: sub.break_before,
            break_after: sub.break_after,
            groups,
          };
        });

        const newSubjects = await Promise.all(subjectPromises);

        setSubjects(prev => [...prev, ...newSubjects]);
      }
    } catch (error) {
      console.error("Error fetching recruitments:", error);
    }
  };
  const fetchRecruitments = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/recruitments/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRecruitments(data);
      }
    } catch (error) {
      console.error("Error fetching recruitments:", error);
    }
  };

  const fetchPrevSubjects = async () => {
    const token = localStorage.getItem("access_token");
    try {
      // Pobieranie wszystkich przedmiotów dla kopiowania
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subjects/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPrevSubjects(data);
      }
    } catch (error) {
      console.error("Error fetching previous subjects:", error);
    }
  };

  const fetchHosts = async () => {
    const token = localStorage.getItem("access_token");
    const org = localStorage.getItem("org_id");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${org}/hosts/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setHosts(data);
      }
    } catch (error) {
      console.error("Error fetching hosts:", error);
    }
  };

  const fetchTags = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/tags/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchGroups = async () => {
    const token = localStorage.getItem("access_token");
    const org_id = localStorage.getItem("org_id");
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/identity/organizations/${org_id}/groups/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const filtered = data.filter(g => g.category !== 'meeting');
        setGroups(filtered);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const fetchRooms = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/rooms/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  useEffect(() => {
    fetchRecruitments();
    fetchPrevSubjects();
    fetchHosts();
    fetchTags();
    fetchGroups();
    fetchRooms();
  }, []);

  // ===== RECRUITMENT OPERATIONS =====
  const createSubject = async (rec_id, sub_name, min_stu, cap, dur, tags, hosts, break_before, break_after, groups) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/subjects/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recruitment: rec_id,
          subject_name: sub_name,
          capacity: cap,
          min_students: min_stu,
          duration: dur,
          break_before: break_before,
          break_after: break_after
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("Error creating subject:", response.status, errorData);
        return;
      }

      const data = await response.json();
      const subjectId = data.subject_id;
      const subTasks = [];

      // Add tags
      for (const tag of tags) {
        subTasks.push(fetch('http://127.0.0.1:8000/api/v1/scheduling/subject-tags/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subject: subjectId, tag: tag.tag_id })
        }));
      }

      // Add hosts (SubjectGroups)
      for (const host of hosts) {
        subTasks.push(fetch('http://127.0.0.1:8000/api/v1/scheduling/subject-groups/create-with-recruitment/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            subject: subjectId,
            host_user: host.id
          })
        }));
      }
      for (const group of groups) {
        subTasks.push(fetch('http://127.0.0.1:8000/api/v1/identity/user-subjects/bulk_add_group/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            subject: subjectId,
            group: group.group_id
          })
        }));
      }

      await Promise.all(subTasks.map(p => p.catch(e => console.error("Error in sub-task for subject creation:", e))));

    } catch (error) {
      console.error("Error creating subject:", error);
    }
  };

  const addGroupToRecruitment = async (rec_id, group_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/identity/user-recruitments/bulk_add_group/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group: group_id, recruitment: rec_id })
      });
      if (!response.ok) {
        console.error("Error adding group to recruitment. Status:", response.status);
      }
    } catch (error) {
      console.error("Error adding group to recruitment:", error);
    }
  };

  const addGroupToSubject = async (rec_id, group_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/identity/user-subjects/bulk_add_group/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group: group_id, recruitment: rec_id })
      });
      if (!response.ok) {
        console.error("Error adding group to recruitment. Status:", response.status);
      }
    } catch (error) {
      console.error("Error adding group to recruitment:", error);
    }
  };

  const postRoomRecruitment = async (rec_id, room_id) => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/room-recruitments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ room: room_id, recruitment: rec_id })
      });
      if (!response.ok) {
        console.error("Error posting room recruitment. Status:", response.status);
      }
    } catch (error) {
      console.error("Error posting room recruitment:", error);
    }
  };

  // Logika tworzenia nowej rekrutacji
  const addRecruitment = async () => {
    if (!recruitmentName || !dayStartTime || !dayEndTime || !startDate || !endDate || !prefDate || !prefDateEnd) {
      openModal("Wypełnij wszystkie wymagane pola");
      return;
    }

    if (dayStartTime >= dayEndTime) {
      openModal("Czas rozpoczęcia dnia musi być wcześniejszy niż czas zakończenia");
      return;
    }

    if (subjects.length === 0) {
      openModal("Wymagany jest co najmniej jeden przedmiot do rekrutacji");
      return;
    }

    const token = localStorage.getItem("access_token");
    const org = localStorage.getItem("org_id");

    try {
      // 1. UTWORZENIE REKRUTACJI
      const response = await fetch('http://127.0.0.1:8000/api/v1/scheduling/recruitments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recruitment_name: recruitmentName,
          organization: org,
          day_start_time: dayStartTime,
          day_end_time: dayEndTime,
          user_prefs_start_date: prefDate,
          plan_start_date: startDate,
          user_prefs_end_date: prefDateEnd,
          expiration_date: endDate,
          cycle_type: cycleType,
          plan_status: planStatus,
          default_token_count: defaultTokenCount,
          max_round_execution_time: roundBreakLength
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        console.error("API Error creating recruitment:", response.status, errorData);
        openModal(`Błąd podczas dodawania rekrutacji: ${errorData.detail || 'Nieznany błąd.'}`);
        return;
      }

      const data = await response.json();
      const recId = data.recruitment_id;

      // 2. TWORZENIE ASYNCHRONICZNYCH ZADAŃ
      const tasks = [];

      // A. Dodaj Przedmioty
      for (const sub of subjects) {
        tasks.push(
          createSubject(
            recId, sub.subject_name, sub.min_students,
            sub.capacity, sub.duration, sub.tags, sub.hosts,
            sub.break_before, sub.break_after, sub.groups
          )
        );
      }

      // B. Dodaj Grupy
      for (const g of recGroups) {
        tasks.push(addGroupToRecruitment(recId, g.group_id));
      }

      // C. Dodaj Pokoje (wszystkie załadowane pokoje)
      for (const r of rooms) {
        tasks.push(postRoomRecruitment(recId, r.room_id));
      }


      // 3. POCZEKAJ NA UKOŃCZENIE WSZYSTKICH ZADAŃ (i loguj błędy, ale kontynuuj)
      await Promise.all(tasks.map(p => p.catch(e => console.error("Error in post-creation task:", e))));

      openModal(`Dodano rekrutację: ${data.recruitment_name}`);
      fetchRecruitments();
      fetchPrevSubjects();
      clearRecruitmentForm();
      setActiveView('list');

    } catch (error) {
      console.error("Error adding recruitment:", error);
      openModal("Błąd podczas dodawania rekrutacji (błąd sieci lub serwera)");
    }
  };

  // NOWA: Logika aktualizacji istniejącej rekrutacji
  const updateRecruitment = async () => {
    if (!selectedRecruitment || !selectedRecruitment.recruitment_id) {
      openModal("Błąd: Brak ID rekrutacji do aktualizacji.", "error");
      return;
    }

    // Wymagane pola (jak w addRecruitment)
    if (!recruitmentName || !dayStartTime || !dayEndTime || !startDate || !endDate || !prefDate || !prefDateEnd) {
      openModal("Wypełnij wszystkie wymagane pola", "error");
      return;
    }

    if (subjects.length === 0) {
      openModal("Wymagany jest co najmniej jeden przedmiot do rekrutacji", "error");
      return;
    }

    const token = localStorage.getItem("access_token");
    const recId = selectedRecruitment.recruitment_id;

    try {
      // 1. AKTUALIZACJA REKRUTACJI (PATCH)
      const response = await fetch(`http://127.0.0.1:8000/api/v1/scheduling/recruitments/${recId}/`, {
        method: 'PATCH', // Używamy PATCH dla częściowej aktualizacji
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          recruitment_name: recruitmentName,
          day_start_time: dayStartTime,
          day_end_time: dayEndTime,
          user_prefs_start_date: prefDate,
          plan_start_date: startDate,
          user_prefs_end_date: prefDateEnd,
          expiration_date: endDate,
          cycle_type: cycleType,
          plan_status: planStatus,
          default_token_count: defaultTokenCount,
          max_round_execution_time: roundBreakLength
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        openModal(`Błąd podczas aktualizacji: ${errorData.detail || 'Nieznany błąd.'}`, "error");
        return;
      }

      // 2. SYNCHRONIZACJA PODRZĘDNYCH OBIEKTÓW (Subjects, Groups, Rooms)
      // UWAGA: Pełna logika synchronizacji (usuwanie starych, dodawanie nowych)
      // jest złożona i wymaga oddzielnych endpointów lub logiki.
      // W tej wersji oprogramowania, skupimy się na ponownym dodaniu/nadpisaniu.

      // Na razie pomijamy automatyczną synchronizację,
      // zakładając, że to użytkownik ręcznie zaktualizuje przedmioty/grupy.
      // Aby zachować funkcjonalność tworzenia przedmiotów w tej sesji,
      // należy wdrożyć API do edycji przedmiotów (nie tylko ich tworzenia).

      // Prawidłowa implementacja wymaga:
      // a) Pobrania istniejących subjects/groups/rooms powiązanych z recId
      // b) Porównania ich ze stanem subjects/recGroups/rooms
      // c) Wywołania DELETE dla usuniętych i POST/PATCH dla dodanych/zmienionych.

      openModal(`Rekrutacja zaktualizowana: ${recruitmentName}`, "success");
      fetchRecruitments();
      setActiveView('list');
      clearRecruitmentForm(); // Wyczyść formularz i wróć do widoku listy

    } catch (error) {
      console.error("Error updating recruitment:", error);
      openModal("Błąd sieci podczas aktualizacji rekrutacji", "error");
    }
  };

  // Logika usuwania rekrutacji
  const deleteRecruitment = async (rec_id) => {
    const token = localStorage.getItem("access_token");
    setIsConfirmModalOpen(false); // Zamknij modal potwierdzenia

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/scheduling/recruitments/${rec_id}/`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok || response.status === 204) {
        openModal(`Rekrutacja usunięta pomyślnie!`, "success");
        fetchRecruitments(); // Odśwież listę
      } else {
        let errorData;
        try {
          errorData = await response.json();
          openModal(`Błąd usuwania rekrutacji: ${errorData.detail || JSON.stringify(errorData)}`, "error");
        } catch (e) {
          openModal(`Błąd usuwania rekrutacji (Status: ${response.status})`, "error");
        }
      }
    } catch (error) {
      console.error("Error deleting recruitment:", error);
      openModal("Błąd sieci podczas usuwania rekrutacji", "error");
    }
  };

  // Funckja do ładowania danych rekrutacji do edycji
  const loadRecruitmentForEdit = (recruitment) => {
    // Wyczyść formularz (bez resetowania subjects i recGroups)
    clearRecruitmentFormForEdit();

    // Ustawienie głównego obiektu rekrutacji
    setSelectedRecruitment(recruitment);

    // Ustawienie głównych pól do formularza
    setRecruitmentName(recruitment.recruitment_name);
    setDayStartTime(formatTime(recruitment.day_start_time));
    setDayEndTime(formatTime(recruitment.day_end_time));
    setStartDate(recruitment.plan_start_date ? recruitment.plan_start_date.substring(0, 16) : "");
    setEndDate(recruitment.expiration_date ? recruitment.expiration_date.substring(0, 16) : "");
    setPrefDate(recruitment.user_prefs_start_date ? recruitment.user_prefs_start_date.substring(0, 16) : "");
    setPrefDateEnd(recruitment.user_prefs_end_date ? recruitment.user_prefs_end_date.substring(0, 16) : "");
    setCycleType(recruitment.cycle_type);
    setPlanStatus(recruitment.plan_status);
    setDefaultTokenCount(recruitment.default_token_count);
    setRoundBreakLength(recruitment.max_round_execution_time);
    fetchSubjectsForRec(recruitment.recruitment_id);
    console.log(subjects)
    // TODO: Wymagana jest logika pobierania i ustawiania subjects, recGroups i rooms
    // Wymaga oddzielnych endpointów API do pobrania tych podrzędnych zasobów na podstawie rec_id.

    setActiveView('create');
    setActiveTab('recruitment');
  };

  const addSubject = () => {
    if (!subName || !capacity || !duration) {
      openModal("Wypełnij wszystkie wymagane pola");
      return;
    }

    if (Number(capacity) < Number(minParp)) {
      openModal("Minimalna liczba studentów nie może przekraczać maksymalnej");
      return;
    }

    if (subTeachers.length === 0) {
      openModal("Co najmniej jeden prowadzący wymagany");
      return;
    }
    if (groups.length === 0) {
      openModal("Co najmniej jedna grupa wymagana");
      return;
    }
    const newSub = {
      subject_name: subName,
      capacity: capacity,
      duration: duration,
      tags: subTags,
      min_students: minParp,
      hosts: subTeachers,
      break_before: breakB,
      break_after: breakA,
      groups: subGroups
    };
    for (const g of newSub.groups) {
      addRecGroup(g.group_id);
    }
    setSubjects([...subjects, newSub]);
    openModal(`Dodano przedmiot: ${newSub.subject_name}`);
    clearSubjectForm();
  };

  const editSubject = () => {
    if (subTeachers.length === 0) {
      openModal("Co najmniej jeden prowadzący wymagany");
      return;
    }

    const updatedSub = {
      subject_name: subName,
      capacity: capacity,
      duration: parseInt(duration),
      tags: subTags,
      min_students: minParp,
      hosts: subTeachers,
      break_before: parseInt(breakB),
      break_after: parseInt(breakA),
      groups: subGroups
    };

    setSubjects(subjects.map((s, i) => i === editIndex ? updatedSub : s));
    openModal('Przedmiot zaktualizowany');
    clearSubjectForm();
  };

  const deleteSubject = (index) => {
    openConfirmModal("Czy na pewno chcesz usunąć ten przedmiot?", () => {
      setSubjects(subjects.filter((_, i) => i !== index));
      setIsConfirmModalOpen(false);
      openModal("Przedmiot usunięty");
    });
  };

  const setEditSubject = (subject, index) => {
    setSubName(subject.subject_name);
    setCapacity(subject.capacity);
    setDuration(subject.duration);
    setSubTags(subject.tags);
    setParp(subject.min_students);
    setTeachers(subject.hosts);
    setSubGroups(subject.groups)
    setBreakB(subject.break_before);
    setBreakA(subject.break_after);
    setEditIndex(index);
    setSubjectMode('edit');
  };

  const copyRecruitment = async (rec_id) => {
    const rec = recruitments.find(r => r.recruitment_id === rec_id);
    if (!rec) return;

    setRecruitmentName(rec.recruitment_name + " (kopia)");
    setDayStartTime(rec.day_start_time);
    setDayEndTime(rec.day_end_time);
    setCycleType(rec.cycle_type);
    setDefaultTokenCount(rec.default_token_count);
    setRoundBreakLength(rec.max_round_execution_time);
    setPlanStatus("draft");
    setStartDate("");
    setEndDate("");
    setPrefDate("");
    setPrefDateEnd("");
    setRecGroups([]);
    setSelectedRecruitment(null); // Upewnij się, że jesteśmy w trybie tworzenia

    const copiedSubjects = prevSubjects.filter(s => s.recruitment === rec_id);
    const token = localStorage.getItem("access_token");

    const subjectsWithDetails = await Promise.all(
      copiedSubjects.map(async (sub) => {
        const fetchTasks = [];
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // 1. Fetch Tags
        fetchTasks.push(
          fetch(
            `http://127.0.0.1:8000/api/v1/scheduling/subjects/${sub.subject_id}/tags/`,
            {
              method: 'GET',
              headers: headers,
            }
          ).then(res => res.ok ? res.json() : []).catch(() => [])
        );

        // 2. Fetch Hosts (SubjectGroups for this subject)
        fetchTasks.push(
          fetch(
            `http://127.0.0.1:8000/api/v1/scheduling/subject-groups/?subject=${sub.subject_id}`,
            {
              method: 'GET',
              headers: headers,
            }
          ).then(res => res.ok ? res.json() : []).catch(() => [])
        );

        const [tagsData, subjectGroups] = await Promise.all(fetchTasks);

        const hostIds = subjectGroups.map(sg => sg.host);
        const subjectHosts = hosts.filter(h => hostIds.includes(h.id));

        return {
          subject_name: sub.subject_name,
          capacity: sub.capacity,
          duration: sub.duration,
          min_students: sub.min_students,
          break_before: sub.break_before,
          break_after: sub.break_after,
          tags: tagsData,
          hosts: subjectHosts
        };
      })
    );

    setSubjects(subjectsWithDetails);
    openModal(`Skopiowano rekrutację: ${rec.recruitment_name}. Dodaj daty i prowadzących.`);
    setActiveView('create');
  };

  // ===== TAG & GROUP OPERATIONS =====
  const addTagToSubject = (tag_id) => {
    const tag = tags.find(t => t.tag_id === tag_id);
    if (tag && !subTags.some(t => t.tag_id === tag.tag_id)) {
      setSubTags([...subTags, tag]);
    }
  };

  const deleteSubTag = (tag_id) => {
    setSubTags(subTags.filter(t => t.tag_id !== tag_id));
  };

  const addSubTeacher = (host_id) => {
    const host = hosts.find(h => h.id === host_id);
    if (host) {
      setTeachers([...subTeachers, host]);
    }
  };

  const deleteSubTeacher = (host_id) => {
    setTeachers(subTeachers.filter(t => t.id !== host_id));
  };

  const addRecGroup = (group_id) => {
    const group = groups.find(g => g.group_id === group_id);
    if (group && !recGroups.some(g => g.group_id === group.group_id)) {
      setRecGroups([...recGroups, group]);
    }
  };

  const addSubGroup = (group_id) => {
    const group = groups.find(g => g.group_id === group_id);
    if (group && !subGroups.some(g => g.group_id === group.group_id)) {
      setSubGroups([...subGroups, group]);
    }
  };

  const deleteRecGroup = (group_id) => {
    setRecGroups(recGroups.filter(g => g.group_id !== group_id));
  };
  const deleteSubGroup = (group_id) => {
    setSubGroups(subGroups.filter(g => g.group_id !== group_id));
  };

  // ===== RENDER FUNCTIONS =====
  const renderRecruitmentsList = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Lista Rekrutacji</h2>
        <p className="admin-content-description">
          Wszystkie rekrutacje w systemie ({recruitments.length})
        </p>
      </div>

      {recruitments.length > 0 ? (
        <div className="admin-table">
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '25%' }}>
                  Nazwa
                </th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '10%' }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '25%' }}>
                  Okres harmonogramu
                </th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '15%' }}>
                  Godziny dnia
                </th>
                <th style={{ textAlign: 'left', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '10%' }}>
                  Typ cyklu
                </th>
                <th style={{ textAlign: 'right', padding: '16px', borderBottom: '2px solid #e5e7eb', width: '15%' }}>
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {recruitments.map((rec) => (
                <tr
                  key={rec.recruitment_id}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedRecruitment(rec);
                    setActiveView('edit');
                  }}
                >
                  <td style={{ padding: '16px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rec.recruitment_name}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span className={`admin-badge ${rec.plan_status === 'active' ? 'success' : 'secondary'}`}>
                      {rec.plan_status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    {formatDisplayDate(rec.plan_start_date)} - {formatDisplayDate(rec.expiration_date)}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.85rem' }}>
                    {formatTime(rec.day_start_time)} - {formatTime(rec.day_end_time)}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>
                    {rec.cycle_type === 'weekly' ? 'Tygodniowy' : rec.cycle_type}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Zapobiega przejściu do widoku edycji po kliknięciu przycisku
                        loadRecruitmentForEdit(rec);
                      }}
                      className="admin-btn-icon"
                      style={{ marginRight: '8px' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Zapobiega przejściu do widoku edycji
                        openConfirmModal(
                          `Czy na pewno chcesz usunąć rekrutację: ${rec.recruitment_name}?`,
                          () => deleteRecruitment(rec.recruitment_id)
                        );
                      }}
                      className="admin-btn-icon danger"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">📋</div>
          <h3 className="admin-empty-title">Brak rekrutacji</h3>
          <p className="admin-empty-description">
            Utwórz pierwszą rekrutację, aby rozpocząć
          </p>
        </div>
      )}
    </>
  );

  const renderCreateRecruitment = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {selectedRecruitment ? 'Edytuj Rekrutację' : 'Nowa Rekrutacja'}
        </h2>
        <p className="admin-content-description">
          Wypełnij formularz i dodaj przedmioty
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab('recruitment')}
          className={`admin-tab ${activeTab === 'recruitment' ? 'active' : ''}`}
        >
          📋 Dane Rekrutacji
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`admin-tab ${activeTab === 'subjects' ? 'active' : ''}`}
        >
          📚 Przedmioty ({subjects.length})
        </button>
      </div>

      {/* Tab Content: Recruitment Data */}
      {activeTab === 'recruitment' && (
        <>
          {!selectedRecruitment && recruitments.length > 0 && (
            <div className="admin-form-group">
              <label className="admin-label">Skopiuj z istniejącej rekrutacji</label>
              <select
                className="admin-select"
                onChange={(e) => {
                  if (e.target.value) {
                    copyRecruitment(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
              >
                <option value="">Wybierz rekrutację...</option>
                {recruitments.map((r) => (
                  <option key={r.recruitment_id} value={r.recruitment_id}>
                    {r.recruitment_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form className="admin-form">
            <div className="admin-form-group full-width">
              <label className="admin-label">Nazwa rekrutacji *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="np. Rekrutacja Zimowa 2024"
                value={recruitmentName}
                onChange={(e) => setRecruitmentName(e.target.value)}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Początek dnia *</label>
                <input
                  type="time"
                  className="admin-input"
                  step="900"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Koniec dnia *</label>
                <input
                  type="time"
                  className="admin-input"
                  step="900"
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Początek wybierania preferencji *</label>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={prefDate}
                  onChange={(e) => setPrefDate(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Koniec wybierania preferencji *</label>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={prefDateEnd}
                  onChange={(e) => setPrefDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Początek harmonogramu *</label>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Koniec harmonogramu *</label>
                <input
                  type="datetime-local"
                  className="admin-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Typ harmonogramu *</label>
                <select
                  className="admin-select"
                  value={cycleType}
                  onChange={(e) => setCycleType(e.target.value)}
                >
                  <option value="weekly">Tygodniowy</option>
                  <option value="biweekly">Dwutygodniowy</option>
                  <option value="monthly">Miesięczny</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Status rekrutacji *</label>
                <select
                  className="admin-select"
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Punkty preferencji *</label>
                <input
                  type="number"
                  className="admin-input"
                  placeholder="40"
                  value={defaultTokenCount}
                  onChange={(e) => setDefaultTokenCount(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Długość tury (minuty) *</label>
                <input
                  type="number"
                  className="admin-input"
                  placeholder="10"
                  value={roundBreakLength}
                  onChange={(e) => setRoundBreakLength(e.target.value)}
                />
              </div>
            </div>
          </form>

          <div className="admin-actions">
            <button
              onClick={() => {
                clearRecruitmentForm();
                setActiveView('list');
              }}
              className="admin-btn secondary"
            >
              Anuluj
            </button>
            <button
              onClick={selectedRecruitment ? updateRecruitment : addRecruitment}
              className="admin-btn primary"
            >
              {selectedRecruitment ? 'Zapisz Zmiany' : 'Utwórz Rekrutację'}
            </button>
          </div>
        </>
      )}

      {/* Tab Content: Subjects Management */}
      {activeTab === 'subjects' && (
        <>
          {/* Przycisk "Dodaj Przedmiot" przeniesiony na górę i wyrównany do prawej */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setSubjectMode('add')}
              className="admin-btn primary"
            >
              ➕ Dodaj Przedmiot
            </button>
          </div>

          {subjectMode === 'list' && (
            <>
              {subjects.length > 0 ? (
                <div className="admin-table">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Przedmiot
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Pojemność
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Min. studentów
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Czas (min)
                        </th>
                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Prowadzący
                        </th>
                        <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e5e7eb' }}>
                          Akcje
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((sub, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px', fontWeight: 600 }}>
                            {sub.subject_name}
                          </td>
]                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {sub.capacity}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {sub.min_students}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {sub.duration}
                          </td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>
                            {sub.hosts.map(h => `${h.first_name} ${h.last_name}`).join(', ')}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              onClick={() => setEditSubject(sub, index)}
                              className="admin-btn-icon"
                              style={{ marginRight: '8px' }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteSubject(index)}
                              className="admin-btn-icon danger"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty-state">
                  <div className="admin-empty-icon">📚</div>
                  <h3 className="admin-empty-title">Brak przedmiotów</h3>
                  <p className="admin-empty-description">
                    Dodaj pierwszy przedmiot do tej rekrutacji
                  </p>
                </div>
              )}
            </>
          )}

          {(subjectMode === 'add' || subjectMode === 'edit') && renderSubjectForm(subjectMode === 'edit')}
        </>
      )}
    </>
  );

  const renderSubjectForm = (isEditing) => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">
          {isEditing ? 'Edytuj Przedmiot' : 'Dodaj Przedmiot'}
        </h2>
        <p className="admin-content-description">
          Wypełnij dane przedmiotu
        </p>
      </div>

      <form className="admin-form">
        <div className="admin-form-group full-width">
          <label className="admin-label">Nazwa przedmiotu *</label>
          <input
            type="text"
            className="admin-input"
            placeholder="np. Matematyka"
            value={subName}
            onChange={(e) => setSubName(e.target.value)}
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Maksymalna pojemność *</label>
            <input
              type="number"
              className="admin-input"
              placeholder="30"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Minimalna liczba studentów *</label>
            <input
              type="number"
              className="admin-input"
              placeholder="5"
              value={minParp}
              onChange={(e) => setParp(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Czas trwania (minuty) *</label>
            <input
              type="number"
              className="admin-input"
              placeholder="30"
              step="15"
              value={duration}
              onChange={(e) => {
                const val = Math.round(e.target.value / 15) * 15;
                setDuration(val);
              }}
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Przerwa przed (minuty)</label>
            <input
              type="number"
              className="admin-input"
              placeholder="0"
              step="15"
              value={breakB}
              onChange={(e) => {
                const val = Math.round(e.target.value / 15) * 15;
                setBreakB(val);
              }}
            />
          </div>
        </div>

        <div className="admin-form-group">
          <label className="admin-label">Przerwa po (minuty)</label>
          <input
            type="number"
            className="admin-input"
            placeholder="15"
            step="15"
            value={breakA}
            onChange={(e) => {
              const val = Math.round(e.target.value / 15) * 15;
              setBreakA(val);
            }}
          />
        </div>

        {tags.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj wymagania sali</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addTagToSubject(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz cechę...</option>
              {tags.map((tag) => (
                <option key={tag.tag_id} value={tag.tag_id}>
                  {tag.tag_name}
                </option>
              ))}
            </select>

            {subTags.length > 0 && (
              <div className="admin-tags">
                {subTags.map((tag) => (
                  <span key={tag.tag_id} className="admin-tag">
                    {tag.tag_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => deleteSubTag(tag.tag_id)}
                    >
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {hosts.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj prowadzących *</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addSubTeacher(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz prowadzącego...</option>
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.first_name} {host.last_name}
                </option>
              ))}
            </select>

            {subTeachers.length > 0 && (
              <div className="admin-tags">
                {subTeachers.map((teacher) => (
                  <span key={teacher.id} className="admin-tag">
                    {teacher.first_name} {teacher.last_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => deleteSubTeacher(teacher.id)}
                    >
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {groups.length > 0 && (
          <div className="admin-form-group full-width">
            <label className="admin-label">Dodaj grupy uczestników</label>
            <select
              className="admin-select"
              onChange={(e) => {
                if (e.target.value) {
                  addSubGroup(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
            >
              <option value="">Wybierz grupę...</option>
              {groups.map((g) => (
                <option key={g.group_id} value={g.group_id}>
                  {g.group_name}
                </option>
              ))}
            </select>

            {subGroups.length > 0 && (
              <div className="admin-tags">
                {subGroups.map((g) => (
                  <span key={g.group_id} className="admin-tag">
                    {g.group_name}
                    <span
                      className="admin-tag-remove"
                      onClick={() => deleteSubGroup(g.group_id)}
                    >
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      <div className="admin-actions">
        <button
          onClick={clearSubjectForm}
          className="admin-btn secondary"
        >
          Anuluj
        </button>
        <button
          onClick={isEditing ? editSubject : addSubject}
          className="admin-btn primary"
        >
          {isEditing ? 'Zapisz Zmiany' : 'Dodaj Przedmiot'}
        </button>
      </div>
    </>
  );

  const renderEditRecruitment = () => (
    <>
      <div className="admin-content-header">
        <h2 className="admin-content-title">Podgląd Rekrutacji</h2>
        <p className="admin-content-description">
          {selectedRecruitment?.recruitment_name}
        </p>
      </div>

      <div className="admin-form">
        <div className="admin-form-group full-width">
          <label className="admin-label">Nazwa rekrutacji</label>
          <input
            type="text"
            className="admin-input"
            value={selectedRecruitment?.recruitment_name || ''}
            disabled
          />
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Początek dnia</label>
            <input
              type="text"
              className="admin-input"
              value={selectedRecruitment?.day_start_time || ''}
              disabled
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Koniec dnia</label>
            <input
              type="text"
              className="admin-input"
              value={selectedRecruitment?.day_end_time || ''}
              disabled
            />
          </div>
        </div>

        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Status</label>
            <input
              type="text"
              className="admin-input"
              value={selectedRecruitment?.plan_status || ''}
              disabled
            />
          </div>
          <div className="admin-form-group">
            <label className="admin-label">Typ</label>
            <input
              type="text"
              className="admin-input"
              value={selectedRecruitment?.cycle_type || ''}
              disabled
            />
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <button
          onClick={() => {
            setSelectedRecruitment(null);
            setActiveView('list');
          }}
          className="admin-btn secondary"
        >
          Powrót do listy
        </button>
      </div>
    </>
  );

  // ===== MAIN RENDER =====
  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        {/* Header */}
        <div className="admin-header-section">
          <div className="admin-header-wrapper">
            <div className="admin-header-gradient">
              <div className="admin-header-content">
                <div className="admin-header-title">
                  <h1>Zarządzanie Rekrutacjami</h1>
                  <p className="admin-header-subtitle">
                    Twórz i zarządzaj rekrutacjami oraz przedmiotami
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="admin-main">
          {/* Sidebar */}
          <aside className="admin-sidebar">
            <div className="admin-sidebar-section">
              <h3 className="admin-sidebar-title">Nawigacja</h3>
              <button
                onClick={() => setActiveView('list')}
                className={`admin-sidebar-button ${activeView === 'list' || activeView === 'edit' ? 'active' : ''}`}
              >
                📋 Lista Rekrutacji
              </button>
              <button
                onClick={() => {
                  clearRecruitmentForm();
                  setActiveView('create');
                }}
                className={`admin-sidebar-button ${activeView === 'create' ? 'active' : ''}`}
              >
                ➕ Nowa Rekrutacja
              </button>
            </div>

            {activeView === 'create' && (subjects.length > 0 || recGroups.length > 0) && (
              <div className="admin-sidebar-section">
                <h3 className="admin-sidebar-title">Podgląd</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Przedmioty:</strong> {subjects.length}
                  </p>
                  <p style={{ marginBottom: '8px' }}>
                    <strong>Grupy:</strong> {recGroups.length}
                  </p>
                </div>
              </div>
            )}
          </aside>

          {/* Content Area */}
          <main className="admin-content">
            {activeView === 'list' && renderRecruitmentsList()}
            {activeView === 'create' && renderCreateRecruitment()}
            {activeView === 'edit' && renderEditRecruitment()}
          </main>
        </div>
      </div>

      {/* Modals */}
      <MsgModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={modalMessage}
      />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onCloseYes={() => confirmAction && confirmAction()}
        onCloseNo={() => setIsConfirmModalOpen(false)}
        message={modalMessage}
      />
    </div >
  );
};

export default RecruitmentsPage;