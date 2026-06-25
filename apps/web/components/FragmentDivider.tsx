interface FragmentDividerProps {
  /** Number of segments. 24 reads well at full page width. */
  segments?: number;
  /** Adds a pulsing animation, used for loading/processing states. */
  loading?: boolean;
  className?: string;
}

/**
 * The NEMESIS signature element: a row of small segments, mostly muted
 * gray with a few rendered in fragment red / blue. Order assembled from
 * scattered pieces — used as a section divider, card footer rule, and
 * (with `loading`) a processing indicator.
 */
export function FragmentDivider({ segments = 24, loading = false, className }: FragmentDividerProps) {
  const classes = ["fragment-divider", loading && "fragment-divider--loading", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="presentation" aria-hidden="true">
      {Array.from({ length: segments }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
