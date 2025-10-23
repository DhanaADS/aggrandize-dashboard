export default function TestMinimal() {
  return (
    <html>
      <head>
        <title>Minimal Test</title>
      </head>
      <body style={{ margin: 0, padding: 20, fontFamily: 'Arial, sans-serif', background: 'white' }}>
        <h1 style={{ color: 'red', fontSize: '48px' }}>🚨 MINIMAL TEST</h1>
        <p style={{ color: 'blue', fontSize: '24px' }}>If you can see this text, your browser and Next.js are working.</p>
        <div style={{ background: 'yellow', padding: '20px', margin: '20px 0', border: '3px solid red' }}>
          <h2>CRITICAL TEST</h2>
          <p>This is the most basic possible Next.js page with zero external dependencies.</p>
        </div>
      </body>
    </html>
  );
}