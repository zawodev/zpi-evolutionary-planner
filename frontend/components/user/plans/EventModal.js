/* frontend/components/user/plans/EventModal.js */
import React from 'react';
import { Calendar, Clock, MapPin, BookOpen, Users, User, ChevronDown } from 'lucide-react';
import { getEventVisuals } from '@/utils/planUtils';
import { useEventModal } from '@/hooks/useEventModal';

const EventModal = ({ item, onClose, meetingData }) => {
  const {
    groupDetails,
    isLoadingGroup,
    expandedSections,
    toggleSection,
    handleOverlayClick
  } = useEventModal(meetingData, onClose);

  const visuals = getEventVisuals(item, 'type');
  const IconComponent = visuals.icon;

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">{item.title}</h2>
            <p className="modal-subtitle">
              <Calendar size={14} />
              {formatDate(item.date)}
            </p>
          </div>
          <button 
            className="modal-close-button" 
            onClick={onClose}
            aria-label="Zamknij"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Basic Info Section */}
          <div className="modal-section">
            <h3 className="modal-section-title">Informacje podstawowe</h3>
            <div className="modal-info-grid">
              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <IconComponent size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Typ zajęć</p>
                  <p className="modal-info-value">{item.type}</p>
                </div>
              </div>

              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <Clock size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Godziny</p>
                  <p className="modal-info-value">{item.startTime} - {item.endTime}</p>
                </div>
              </div>

              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <MapPin size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Sala</p>
                  <p className="modal-info-value">{item.room}</p>
                </div>
              </div>

              {item.group && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <Users size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Grupa</p>
                    <p className="modal-info-value">{item.group}</p>
                  </div>
                </div>
              )}

              {item.hostName && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <User size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Prowadzący</p>
                    <p className="modal-info-value">{item.hostName}</p>
                  </div>
                </div>
              )}

              {meetingData?.recruitment && (
                <div className="modal-info-item">
                  <div className="modal-info-icon">
                    <BookOpen size={20} />
                  </div>
                  <div className="modal-info-content">
                    <p className="modal-info-label">Rekrutacja</p>
                    <p className="modal-info-value">{meetingData.recruitment.recruitment_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants Section */}
          {isLoadingGroup && (
            <div className="modal-section">
              <h3 className="modal-section-title">Uczestnicy</h3>
              <div className="modal-loading">
                <div className="modal-loading-spinner"></div>
                <p>Ładowanie listy uczestników...</p>
              </div>
            </div>
          )}

          {groupDetails?.students && groupDetails.students.length > 0 && (
            <div className="modal-section">
              <h3 className="modal-section-title">
                Studenci ({groupDetails.students.length})
              </h3>
              <div className="modal-participants-list">
                {groupDetails.students.map((student, index) => (
                  <div key={student.id || index} className="modal-participant-item">
                    <div 
                      className="modal-participant-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${visuals.colors.bg} 0%, ${visuals.colors.text} 100%)`
                      }}
                    >
                      {getInitials(`${student.first_name} ${student.last_name}`)}
                    </div>
                    <div className="modal-participant-info">
                      <p className="modal-participant-name">
                        {student.first_name} {student.last_name}
                      </p>
                      {student.email && (
                        <p className="modal-participant-email">{student.email}</p>
                      )}
                      {student.username && !student.email && (
                        <p className="modal-participant-email">@{student.username}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-expandable-section">
                {/* Teachers Section */}
                {groupDetails.teachers && groupDetails.teachers.length > 0 && (
                  <div style={{marginBottom: '0.75rem'}}>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('teachers')}
                    >
                      <div className="modal-expand-button-content">
                        <User size={16} />
                        <span>Prowadzący</span>
                        <span className="modal-expand-count">{groupDetails.teachers.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.teachers ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.teachers && (
                      <div className="modal-expandable-content">
                        {groupDetails.teachers.map((teacher, index) => (
                          <div key={teacher.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                              }}
                            >
                              {getInitials(`${teacher.first_name} ${teacher.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {teacher.first_name} {teacher.last_name}
                              </p>
                              {teacher.email && (
                                <p className="modal-participant-email">{teacher.email}</p>
                              )}
                              {teacher.username && !teacher.email && (
                                <p className="modal-participant-email">@{teacher.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assistants Section */}
                {groupDetails.assistants && groupDetails.assistants.length > 0 && (
                  <div style={{marginBottom: '0.75rem'}}>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('assistants')}
                    >
                      <div className="modal-expand-button-content">
                        <Users size={16} />
                        <span>Asystenci</span>
                        <span className="modal-expand-count">{groupDetails.assistants.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.assistants ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.assistants && (
                      <div className="modal-expandable-content">
                        {groupDetails.assistants.map((assistant, index) => (
                          <div key={assistant.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                              }}
                            >
                              {getInitials(`${assistant.first_name} ${assistant.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {assistant.first_name} {assistant.last_name}
                              </p>
                              {assistant.email && (
                                <p className="modal-participant-email">{assistant.email}</p>
                              )}
                              {assistant.username && !assistant.email && (
                                <p className="modal-participant-email">@{assistant.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Observers Section */}
                {groupDetails.observers && groupDetails.observers.length > 0 && (
                  <div>
                    <button 
                      className="modal-expand-button"
                      onClick={() => toggleSection('observers')}
                    >
                      <div className="modal-expand-button-content">
                        <Users size={16} />
                        <span>Obserwatorzy</span>
                        <span className="modal-expand-count">{groupDetails.observers.length}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`modal-expand-icon ${expandedSections.observers ? 'expanded' : ''}`}
                      />
                    </button>
                    {expandedSections.observers && (
                      <div className="modal-expandable-content">
                        {groupDetails.observers.map((observer, index) => (
                          <div key={observer.id || index} className="modal-participant-item">
                            <div 
                              className="modal-participant-avatar"
                              style={{
                                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
                              }}
                            >
                              {getInitials(`${observer.first_name} ${observer.last_name}`)}
                            </div>
                            <div className="modal-participant-info">
                              <p className="modal-participant-name">
                                {observer.first_name} {observer.last_name}
                              </p>
                              {observer.email && (
                                <p className="modal-participant-email">{observer.email}</p>
                              )}
                              {observer.username && !observer.email && (
                                <p className="modal-participant-email">@{observer.username}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoadingGroup && groupDetails && (!groupDetails.students || groupDetails.students.length === 0) && (
            <div className="modal-section">
              <h3 className="modal-section-title">Uczestnicy</h3>
              <p style={{color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '1rem'}}>
                Brak informacji o uczestnikach
              </p>
            </div>
          )}

          {/* Additional Details Section */}
          {meetingData?.subject_group?.subject && (
            <div className="modal-section">
              <h3 className="modal-section-title">Szczegóły przedmiotu</h3>
              <div className="modal-info-item">
                <div className="modal-info-icon">
                  <BookOpen size={20} />
                </div>
                <div className="modal-info-content">
                  <p className="modal-info-label">Nazwa przedmiotu</p>
                  <p className="modal-info-value">
                    {meetingData.subject_group.subject.subject_name}
                  </p>
                  {meetingData.subject_group.subject.subject_code && (
                    <p className="modal-info-label" style={{marginTop: '0.25rem'}}>
                      Kod: {meetingData.subject_group.subject.subject_code}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;