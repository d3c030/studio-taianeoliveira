import { DndContext, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Minimal sortable list built on @dnd-kit/core (drop onto another row to move there). */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
  className,
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  render: (item: T, handle: ReactNode) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className={className}>
        {items.map((it) => (
          <Row key={it.id} id={it.id} render={(h) => render(it, h)} />
        ))}
      </div>
    </DndContext>
  );
}

function Row({ id, render }: { id: string; render: (handle: ReactNode) => ReactNode }) {
  const drag = useDraggable({ id });
  const drop = useDroppable({ id });
  const style = drag.transform ? { transform: `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)` } : undefined;
  const handle = (
    <button
      type="button"
      aria-label="Arrastar para reordenar"
      className="touch-none cursor-grab rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
      {...drag.listeners}
      {...drag.attributes}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
  return (
    <div
      ref={(n) => {
        drag.setNodeRef(n);
        drop.setNodeRef(n);
      }}
      style={style}
      className={cn(
        "relative",
        drag.isDragging && "z-50 opacity-80 shadow-lg",
        drop.isOver && !drag.isDragging && "ring-2 ring-primary rounded-xl",
      )}
    >
      {render(handle)}
    </div>
  );
}
