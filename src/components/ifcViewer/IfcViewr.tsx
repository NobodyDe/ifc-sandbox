import type { ChangeEvent } from "react";
import { useIfcViewer } from "./useIfcViewer";

export function IfcViewer() {
  const { containerRef, ready, converting, loadIfcFile } = useIfcViewer();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadIfcFile(file);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div style={{ position: "absolute", top: 16, left: 16 }}>
        <input
          type="file"
          accept=".ifc"
          onChange={handleFileChange}
          disabled={!ready}
        />
        {converting && <p>Convertendo IFC em fragments...</p>}
      </div>
    </div>
  );
}
