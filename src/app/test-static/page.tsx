export default function TestStaticPage() {
  return (
    <html>
      <body style={{
        margin: '0',
        padding: '40px',
        backgroundColor: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1>🎯 STATIC HTML TEST - NO JAVASCRIPT</h1>
        <p>This is pure static HTML with zero dependencies.</p>
        <div style={{
          backgroundColor: '#00FF00',
          color: 'white',
          padding: '20px',
          marginTop: '20px'
        }}>
          If you can see this GREEN box, static HTML rendering works perfectly.
        </div>
      </body>
    </html>
  );
}