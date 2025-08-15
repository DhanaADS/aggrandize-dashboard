export default function WorkflowEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      zIndex: 9999,
      background: '#f5f5f7'
    }}>
      {children}
    </div>
  );
}