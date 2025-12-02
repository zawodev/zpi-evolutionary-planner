import React, { useState, useEffect, useMemo } from 'react';

const parseTime = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) {
        console.error("Invalid time string format:", timeStr);
        return 0;
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};

export default function BanSlotsModal({
    isOpen,
    onClose,
    onSave,
    startTime = "8:00",
    endTime = "17:00",
    mode = 'weekly',
    initialBannedSlots
}) {
    const [grid, setGrid] = useState([]);
    const [timeLabels, setTimeLabels] = useState([]);
    const [colHeaders, setColHeaders] = useState([]);

    const { numRows, numCols } = useMemo(() => {
        const start = parseTime(startTime);
        const end = parseTime(endTime);
        const rows = end > start ? (end - start) / 15 : 0;

        let cols = 7; 
        if (mode === 'biweekly') cols = 14;
        if (mode === 'monthly') cols = 28;

        return { numRows: Math.max(0, rows), numCols: cols };
    }, [startTime, endTime, mode]);

    useEffect(() => {
        if (isOpen && numRows > 0 && numCols > 0) {

            const getHeaders = (cols) => {
                const days = ["Pon", "Wt", "Śr", "Czw", "Pia", "Sob", "Niedz"];
                if (cols === 7) return days;
                let headers = [];
                for (let w = 1; w <= cols / 7; w++) {
                    headers.push(...days.map(d => `W${w} ${d}`));
                }
                return headers;
            };
            setColHeaders(getHeaders(numCols));

            const labels = [];
            const startMins = parseTime(startTime);
            for (let i = 0; i < numRows; i++) {
                const currentMins = startMins + i * 15;
                const h = Math.floor(currentMins / 60);
                const m = currentMins % 60;
                labels.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
            }
            setTimeLabels(labels);

            const hasValidInitialGrid = initialBannedSlots &&
                initialBannedSlots.length === numRows &&
                initialBannedSlots[0]?.length === numCols;

            if (hasValidInitialGrid) {
                setGrid(initialBannedSlots.map(row => [...row]));
            } else {
                const freshGrid = Array(numRows).fill(0).map(() => Array(numCols).fill(0));
                setGrid(freshGrid);
            }

        } else if (!isOpen) {
            setGrid([]);
            setTimeLabels([]);
            setColHeaders([]);
        }
    }, [isOpen, numRows, numCols, startTime, initialBannedSlots, mode]);


    const handleBlockClick = (r, c) => {
        const newGrid = grid.map((row, rowIndex) => {
            if (rowIndex !== r) return row;
            const newRow = [...row];
            newRow[c] = newRow[c] === 0 ? 1 : 0;
            return newRow;
        });
        setGrid(newGrid);
        console.log(grid);
    };


    const handleSave = () => {
        onSave(grid); 
        onClose();    
    };

    if (!isOpen) {
        return null;
    }
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="modal-backdrop"
        >
            <div className="modal-content">
                <div>
                    <h2 id="modal-title">
                        Ustal niedostępne godziny -
                        <span>
                            {mode}
                        </span>
                    </h2>
                </div>

                <div >
                    <div c>
                        <table >
                            <thead >
                                <tr>
                                    <th >
                                        Time
                                    </th>
                                    {colHeaders.map((header, c) => (
                                        <th
                                            key={c}
                                            scope="col"
                                            style={{ width: `${Math.floor(100 / numCols)}%`, minWidth:'40px'}}
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {grid.length > 0 ? (
                                    timeLabels.map((label, r) => (
                                        <tr key={label}>
                                            <td >
                                                {label}
                                            </td>
                                            {colHeaders.map((_, c) => (
                                                <td
                                                    key={c}
                                                    onClick={() => handleBlockClick(r, c)}
                                                    style={{
                                                        backgroundColor: grid[r] && grid[r][c] === 1 ? 'grey' : 'white',
                                                        border: '1px solid grey'
                                                    }}
                                                    aria-label={`Slot ${colHeaders[c]} at ${label}`}
                                                />
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={numCols + 1}>
                                            Loading grid...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div >
                    <button
                        onClick={onClose}
                        
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                    >
                        Save Banned Slots
                    </button>
                </div>
            </div>
        </div>
    );
}