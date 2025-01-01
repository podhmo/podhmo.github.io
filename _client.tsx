/** @jsxRuntime automatic */
/** @jsxImportSource npm:react@18 */
/** @jsxImportSourceTypes npm:@types/react@18 */

import { StrictMode } from 'npm:react@18';
import { createRoot } from "npm:react-dom@18/client"

function App() {
  return <h1>Hello, world!</h1>;
}

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);