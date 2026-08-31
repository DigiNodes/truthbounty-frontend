import { Button } from "@/stories/Button";

export const ButtonDocs = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h2>Button Component</h2>

      <p>A reusable button component used across the app.</p>

      <h3>Props</h3>
      <ul>
        <li><strong>label</strong>: string — Text inside the button</li>
        <li><strong>onClick</strong>: () =&gt; void — Click handler</li>
        <li><strong>primary</strong>: boolean</li>
      </ul>

      <h3>Usage</h3>
      <pre>
{`<Button 
  label="Click Me" 
  primary={true} 
  onClick={() => console.log("clicked")} 
/>`}
      </pre>

      <h3>Preview</h3>
      <Button 
        label="Click Me" 
        primary={true} 
        onClick={() => alert("Clicked")} 
      />
    </div>
  );
};