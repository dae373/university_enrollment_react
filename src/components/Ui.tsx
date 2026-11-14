import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  note?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "orange" | "red";
}

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "blue",
}: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__top">
        <span>{label}</span>
        <span className="metric-card__icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">📊</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
