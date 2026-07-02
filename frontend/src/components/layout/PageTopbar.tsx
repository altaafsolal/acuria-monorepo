interface PageTopbarProps {
  title: string;
}

export default function PageTopbar({ title }: PageTopbarProps) {
  return (
    <header className="page-topbar">
      <h1 className="page-topbar__title">{title}</h1>
    </header>
  );
}
