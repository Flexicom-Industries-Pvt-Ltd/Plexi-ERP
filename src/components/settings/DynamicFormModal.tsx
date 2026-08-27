"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { ModelConfig, FieldConfig } from "@/lib/config/master-data";
import { toast } from "sonner";

interface Props {
  modelConfig: ModelConfig;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function DynamicFormModal({ modelConfig, initialData, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState<any>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [relationOptions, setRelationOptions] = useState<Record<string, {label: string, value: string}[]>>({});

  useEffect(() => {
    // Initialize default values for booleans
    const defaults = { ...initialData };
    modelConfig.fields.forEach(f => {
      if (f.type === "boolean" && defaults[f.key] === undefined) {
        defaults[f.key] = true;
      }
    });
    if (!initialData) setFormData(defaults);
    
    // Fetch relational data
    modelConfig.fields.forEach(async (f) => {
      if (f.relationEndpoint) {
        try {
          const res = await fetch(`/api/settings/master-data/${f.relationEndpoint}`);
          if (res.ok) {
            const data = await res.json();
            setRelationOptions(prev => ({
              ...prev,
              [f.key]: data.map((item: any) => ({ label: item.name || item.code || item.id, value: item.id }))
            }));
          }
        } catch (e) {
          console.error(`Failed to fetch relation for ${f.key}`);
        }
      }
    });
  }, [modelConfig, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isUpdate = !!initialData?.id;
      const url = isUpdate 
        ? `/api/settings/master-data/${modelConfig.modelName}/${initialData.id}` 
        : `/api/settings/master-data/${modelConfig.modelName}`;
      
      const method = isUpdate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save record.");
      }

      toast.success(`${modelConfig.title} ${isUpdate ? 'updated' : 'created'} successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    if (field.type === "boolean") {
      return (
        <div key={field.key} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={field.key}
            checked={formData[field.key] || false}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.checked })}
            className="h-4 w-4 text-primary rounded border-slate-300"
          />
          <label htmlFor={field.key} className="text-sm font-medium text-slate-700">{field.label}</label>
        </div>
      );
    }

    if (field.type === "select") {
      const options = field.relationEndpoint ? relationOptions[field.key] || [] : field.options || [];
      return (
        <div key={field.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">{field.label} {field.required && "*"}</label>
          <select
            required={field.required}
            value={formData[field.key] || ""}
            onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="" disabled>Select {field.label}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">{field.label} {field.required && "*"}</label>
        <input
          type={field.type === "number" ? "number" : field.type === "time" ? "time" : "text"}
          required={field.required}
          value={formData[field.key] || ""}
          onChange={(e) => setFormData({ 
            ...formData, 
            [field.key]: field.type === "number" ? parseFloat(e.target.value) : e.target.value 
          })}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">
            {initialData ? 'Edit' : 'Add'} {modelConfig.title.replace(/s$/, '')}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid gap-4">
            {modelConfig.fields.map(renderField)}
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Save Changes' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
