import { Button } from '@/components/ui/button';

export const ButtonDocs = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h2>Button Component</h2>

      <p>A reusable button component used across the app.</p>

      <h3>Usage</h3>
      <pre>
{`<Button variant="default" onClick={() => console.log("clicked")}>
  Click Me
</Button>`}
      </pre>

      <h3>Preview</h3>
      <Button variant="default" onClick={() => alert('Clicked')}>
        Click Me
      </Button>
    </div>
  );
};
