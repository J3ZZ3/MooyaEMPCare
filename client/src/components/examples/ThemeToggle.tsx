import ThemeToggle from '../ThemeToggle';

export default function ThemeToggleExample() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Theme Toggle</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Click the button to toggle between light and dark mode.
        </p>
        <ThemeToggle />
      </div>
    </div>
  );
}