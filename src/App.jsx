import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Placeholder({ name }) {
  return <div style={{ padding: '100px 24px', textAlign: 'center' }}><h1>{name}</h1></div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Placeholder name="Home" />} />
        <Route path="*" element={<Placeholder name="404 - Page Not Found" />} />
      </Routes>
    </BrowserRouter>
  );
}
