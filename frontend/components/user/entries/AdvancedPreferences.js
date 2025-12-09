import React, { useState } from 'react';
import { ChevronRight, Info } from 'lucide-react';

const WEIGHT_LABELS = {
  '-5': 'Bardzo duża niechęć',
  '-4': 'Duża niechęć',
  '-3': 'Średnia niechęć',
  '-2': 'Mała niechęć',
  '-1': 'Bardzo mała niechęć',
  '0':  'Neutralne',
  '1':  'Bardzo mała chęć',
  '2':  'Mała chęć',
  '3':  'Średnia chęć',
  '4':  'Duża chęć',
  '5':  'Bardzo duża chęć',
};

const SimplePreferenceInput = ({ title, weight, onWeightChange, description, isEditable }) => (
    <div className="pref-item">
        <label className="pref-label">{title}</label>
        <p className="pref-desc">{description}</p>
        <div className="slider-container">
            <div className="slider-header">
                <span className="slider-label">Waga</span>
                <span className="slider-value">{weight} ({WEIGHT_LABELS[weight] || 'Niestandardowa'})</span>
            </div>
            <input type="range" min="-5" max="5" step="1" value={weight}
                onChange={(e) => onWeightChange(parseInt(e.target.value))}
                className="pref-slider" disabled={!isEditable}
            />
            <div className="slider-markers">
                <span>-5</span><span>0</span><span>5</span>
            </div>
        </div>
        <style jsx>{`
            .pref-item { margin-bottom: 1.5rem; }
            .pref-label { font-size: 0.875rem; font-weight: 600; color: #1f2937; display: block; margin-bottom: 0.375rem; }
            .pref-desc { font-size: 0.8125rem; color: #6b7280; margin-bottom: 0.875rem; }
            .slider-container { background: #f9fafb; border-radius: 0.5rem; padding: 1rem 1.25rem; border: 1px solid #e5e7eb; }
            .slider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
            .slider-label { font-size: 0.8125rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
            .slider-value { font-size: 0.875rem; font-weight: 700; color: #1f2937; padding: 0.25rem 0.625rem; background: white; border-radius: 0.375rem; border: 1px solid #e5e7eb; }
            .pref-slider { width: 100%; height: 8px; border-radius: 4px; appearance: none; background: linear-gradient(to right, #ef4444 0%, #f59e0b 35%, #9ca3af 50%, #a3e635 65%, #22c55e 100%); cursor: pointer; }
            .pref-slider::-webkit-slider-thumb { appearance: none; width: 20px; height: 20px; border-radius: 50%; background: white; border: 3px solid #3b82f6; cursor: pointer; }
            .slider-markers { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.6875rem; color: #9ca3af; }
        `}</style>
    </div>
);

const ComplexPreferenceInput = ({ title, value, weight, onValueChange, onWeightChange, description, min, max, step, unit, isEditable }) => (
    <div className="pref-item">
        <label className="pref-label">{title}</label>
        <p className="pref-desc">{description}</p>
        <div className="complex-inputs">
            <div className="input-group">
                <label className="inp-label">Wartość ({unit})</label>
                <input type="number" min={min} max={max} step={step} value={value}
                    onChange={(e) => onValueChange(parseInt(e.target.value) || 0)}
                    className="pref-input" disabled={!isEditable || weight === 0}
                />
            </div>
            <div className="input-group">
                <label className="inp-label">Waga</label>
                <input type="range" min="-5" max="5" step="1" value={weight}
                    onChange={(e) => onWeightChange(parseInt(e.target.value))}
                    className="pref-slider" disabled={!isEditable}
                />
                <div className="slider-markers"><span>-5</span><span>0</span><span>5</span></div>
            </div>
        </div>
        <style jsx>{`
            .pref-item { margin-bottom: 1.5rem; }
            .pref-label { font-size: 0.875rem; font-weight: 600; color: #1f2937; margin-bottom: 0.375rem; display: block; }
            .pref-desc { font-size: 0.8125rem; color: #6b7280; margin-bottom: 0.875rem; }
            .complex-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem; }
            .input-group { display: flex; flex-direction: column; gap: 0.375rem; }
            .inp-label { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
            .pref-input { width: 100%; padding: 0.625rem 0.875rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.9375rem; font-weight: 500; }
            .pref-slider { width: 100%; height: 8px; border-radius: 4px; appearance: none; background: linear-gradient(to right, #ef4444 0%, #f59e0b 35%, #9ca3af 50%, #a3e635 65%, #22c55e 100%); cursor: pointer; }
            .slider-markers { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.6875rem; color: #9ca3af; }
        `}</style>
    </div>
);

const AdvancedPreferences = ({ complexPrefs, setComplexPrefs, isEditable }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lengthUnit = "bloków (15 min)";
    const slotUnit = "slotów (15 min)";

    const updateSimpleWeight = (key, weight) => isEditable && setComplexPrefs(prev => ({ ...prev, [key]: weight }));
    const updateComplexValue = (key, index, value) => {
        if (isEditable) {
            setComplexPrefs(prev => {
                const newArray = [...(prev[key] || [0, 0])];
                newArray[index] = value;
                if (newArray.length < 2) newArray.push(0);
                return { ...prev, [key]: newArray };
            });
        }
    };

    return (
        <div className="adv-container">
            <div className="adv-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="adv-title">Zaawansowane Preferencje</h3>
                <ChevronRight size={20} className={`adv-toggle ${isExpanded ? 'expanded' : ''}`} />
            </div>
            
            {isExpanded && (
                <div className="adv-content">
                    <div className="adv-info">
                        <Info size={20} className="info-icon" />
                        <div className="info-text">
                            Ustaw wagi dla preferencji. <strong>5</strong> to silna <strong>preferencja</strong>, 
                            <strong> -5</strong> to silna <strong>niechęć</strong>, <strong>0</strong> to neutralność.
                        </div>
                    </div>

                    <div className="pref-group">
                        <h4 className="group-title">Ogólne Wagi Dnia</h4>
                        <SimplePreferenceInput title="Dni wolne (FreeDays)" weight={complexPrefs.FreeDays} onWeightChange={(w) => updateSimpleWeight('FreeDays', w)} description="Jak bardzo chcesz mieć całkowicie wolne dni." isEditable={isEditable} />
                        <SimplePreferenceInput title="Krótkie dni (ShortDays)" weight={complexPrefs.ShortDays} onWeightChange={(w) => updateSimpleWeight('ShortDays', w)} description="Preferencja dni z małą liczbą godzin." isEditable={isEditable} />
                        <SimplePreferenceInput title="Równomierne obciążenie (UniformDays)" weight={complexPrefs.UniformDays} onWeightChange={(w) => updateSimpleWeight('UniformDays', w)} description="Chęć, by każdy dzień pracy miał podobną liczbę godzin." isEditable={isEditable} />
                        <SimplePreferenceInput title="Skupienie dni (ConcentratedDays)" weight={complexPrefs.ConcentratedDays} onWeightChange={(w) => updateSimpleWeight('ConcentratedDays', w)} description="Chęć grupowania dni pracujących." isEditable={isEditable} />
                    </div>
                    
                    <div className="pref-group">
                        <h4 className="group-title">Precyzyjne Ramy Czasowe</h4>
                        <ComplexPreferenceInput title="Minimalna przerwa" value={complexPrefs.MinGapsLength[0]} weight={complexPrefs.MinGapsLength[1]} onValueChange={(v) => updateComplexValue('MinGapsLength', 0, v)} onWeightChange={(w) => updateComplexValue('MinGapsLength', 1, w)} description="Minimalna pożądana długość przerwy." min={0} max={32} step={1} unit={lengthUnit} isEditable={isEditable} />
                        <ComplexPreferenceInput title="Maksymalna przerwa" value={complexPrefs.MaxGapsLength[0]} weight={complexPrefs.MaxGapsLength[1]} onValueChange={(v) => updateComplexValue('MaxGapsLength', 0, v)} onWeightChange={(w) => updateComplexValue('MaxGapsLength', 1, w)} description="Maksymalna tolerowana długość okienka." min={0} max={32} step={1} unit={lengthUnit} isEditable={isEditable} />
                        <ComplexPreferenceInput title="Min. długość dnia" value={complexPrefs.MinDayLength[0]} weight={complexPrefs.MinDayLength[1]} onValueChange={(v) => updateComplexValue('MinDayLength', 0, v)} onWeightChange={(w) => updateComplexValue('MinDayLength', 1, w)} description="Minimalny czas zajęć w dniu." min={0} max={32} step={1} unit={lengthUnit} isEditable={isEditable} />
                        <ComplexPreferenceInput title="Max. długość dnia" value={complexPrefs.MaxDayLength[0]} weight={complexPrefs.MaxDayLength[1]} onValueChange={(v) => updateComplexValue('MaxDayLength', 0, v)} onWeightChange={(w) => updateComplexValue('MaxDayLength', 1, w)} description="Maksymalny czas zajęć w dniu." min={0} max={32} step={1} unit={lengthUnit} isEditable={isEditable} />
                        <ComplexPreferenceInput title="Pref. początek dnia" value={complexPrefs.PreferredDayStartTimeslot[0]} weight={complexPrefs.PreferredDayStartTimeslot[1]} onValueChange={(v) => updateComplexValue('PreferredDayStartTimeslot', 0, v)} onWeightChange={(w) => updateComplexValue('PreferredDayStartTimeslot', 1, w)} description="Numer slotu rozpoczęcia." min={0} max={31} step={1} unit={slotUnit} isEditable={isEditable} />
                        <ComplexPreferenceInput title="Pref. koniec dnia" value={complexPrefs.PreferredDayEndTimeslot[0]} weight={complexPrefs.PreferredDayEndTimeslot[1]} onValueChange={(v) => updateComplexValue('PreferredDayEndTimeslot', 0, v)} onWeightChange={(w) => updateComplexValue('PreferredDayEndTimeslot', 1, w)} description="Numer slotu zakończenia." min={0} max={31} step={1} unit={slotUnit} isEditable={isEditable} />
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .adv-container { background: white; border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); padding: 1.5rem; margin-top: 1.5rem; width: 100%; }
                .adv-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: background 0.2s; }
                .adv-header:hover { background: #f9fafb; }
                .adv-title { font-size: 1.125rem; font-weight: 700; color: #1f2937; margin: 0; }
                .adv-toggle { transition: transform 0.2s; color: #6b7280; }
                .adv-toggle.expanded { transform: rotate(90deg); }
                .adv-content { margin-top: 1.5rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
                .adv-info { background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border: 1px solid #bfdbfe; border-radius: 0.75rem; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; gap: 0.75rem; grid-column: 1 / -1; }
                .info-icon { color: #3b82f6; flex-shrink: 0; }
                .info-text { font-size: 0.8125rem; line-height: 1.6; color: #1e40af; }
                .pref-group { border-top: 2px solid #f3f4f6; padding-top: 1.5rem; }
                .group-title { font-size: 0.9375rem; font-weight: 700; color: #374151; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
                .group-title::before { content: ''; width: 4px; height: 1.25rem; background: linear-gradient(to bottom, #3b82f6, #8b5cf6); border-radius: 2px; }
                
                @media (max-width: 1200px) { .adv-content { grid-template-columns: 1fr; } }
            `}</style>
        </div>
    );
};

export default AdvancedPreferences;