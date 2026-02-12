export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return new Response(JSON.stringify({ error: 'Missing customerId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // In a real application, you would fetch this configuration from a database
  // based on the customerId. For now, we'll return mock data.
  const mockConfig = {
    'customer-123': {
      primaryColor: '#1a73e8', // Google Blue
      welcomeMessage: '환영합니다! 무엇을 도와드릴까요?',
      agentId: 'bot-sales',
      // Add other configurable options here
      headerText: 'Mejai 고객센터',
      logoUrl: 'https://example.com/mejai-logo.png',
      position: 'bottom-right', // 'bottom-left', 'top-right', 'top-left'
    },
    'customer-456': {
      primaryColor: '#008080', // Teal
      welcomeMessage: '안녕하세요! 문의 사항을 남겨주세요.',
      agentId: 'bot-support',
      headerText: 'Mejai 지원팀',
      logoUrl: 'https://example.com/company-logo.png',
      position: 'bottom-left',
    },
  };

  const config = mockConfig[customerId as keyof typeof mockConfig];

  if (!config) {
    return new Response(JSON.stringify({ error: `Configuration not found for customerId: ${customerId}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
