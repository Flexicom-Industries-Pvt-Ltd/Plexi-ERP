"use client";

interface Operator {
  id: string;
  name: string | null;
  email: string | null;
}

interface Props {
  users: Operator[];
  value: string[];
  onChange: (ids: string[]) => void;
}

export function OperatorMultiSelect({ users, value, onChange }: Props) {
  const toggle = (userId: string) => {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
      {users.length === 0 ? (
        <p className="text-xs text-slate-400 px-1">No operators available</p>
      ) : (
        users.map((u) => (
          <label key={u.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={value.includes(u.id)}
              onChange={() => toggle(u.id)}
              className="rounded border-slate-300"
            />
            <span className="text-slate-700">{u.name || u.email}</span>
          </label>
        ))
      )}
    </div>
  );
}
