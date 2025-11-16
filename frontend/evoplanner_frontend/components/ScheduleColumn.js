import React from "react";
import ScheduleSlot from "./ScheduleSlot";
import DragPreview from "./DragPreview";
import { calculateSlotPosition } from "@/utils/scheduleDisplay";

export default function ScheduleColumn({
  day,
  slots,
  dragPreview,
  onMouseDown,
  onSlotClick,
}) {
  return (
    <div
      className="schedule-column"
      onMouseDown={onMouseDown}
    >
      {slots && slots.map((slot, slotIndex) => {
        const position = calculateSlotPosition(slot.start, slot.end);
        return (
          <ScheduleSlot
            key={`${day}-${slotIndex}`}
            slot={slot}
            position={position}
            onClick={(e) => onSlotClick(e, day, slotIndex)}
          />
        );
      })}

      {dragPreview && (
        <DragPreview {...dragPreview} />
      )}
    </div>
  );
}