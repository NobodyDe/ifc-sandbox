import { IfcViewer } from "./components/ifcViewer/IfcViewr";

function App() {
  return (
    <main className="min-h-screen grid place-items-center bg-slate-50">
      <h1 className="text-3xl font-semibold text-slate-900">ifc-loader</h1>
      <IfcViewer />
    </main>
  );
}

export default App;
