export default function Home() {
  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AI Architecture Assistant</h1>
      <p>Welcome to the AI Architecture Assistant!</p>
      <div style={{ marginTop: '20px' }}>
        <a 
          href="/connect" 
          style={{ 
            display: 'inline-block', 
            padding: '10px 20px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px',
            marginRight: '10px'
          }}
        >
          Connect GitHub Repository
        </a>
        <a 
          href="/dashboard" 
          style={{ 
            display: 'inline-block', 
            padding: '10px 20px', 
            backgroundColor: '#666', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px'
          }}
        >
          View Dashboard
        </a>
      </div>
    </div>
  );
}