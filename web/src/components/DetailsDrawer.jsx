import React from 'react'

export default function DetailsDrawer({node}){
  if(!node) return (
    <div className="details-empty">
      <div className="details-empty-icon">◎</div>
      <p>Select a node to inspect its metadata and output.</p>
    </div>
  )

  const raw = node.raw || {}
  const stdout = raw.output || raw.stdout
  const stderr = raw.stderr

  return (
    <div className="details-content">
      <div className="node-title-row">
        <span className="node-color" style={{background:node.color?.background}} />
        <div>
          <h3>{node.label}</h3>
          <p>{node.title || 'No additional metadata'}</p>
        </div>
      </div>
      <div className="node-meta">
        <span><b>ID</b> {node.id}</span>
        {raw.returncode != null && <span><b>EXIT</b> {raw.returncode}</span>}
        {raw.elapsed != null && <span><b>TIME</b> {Number(raw.elapsed).toFixed(2)}s</span>}
      </div>
      {stdout && (
        <div className="output-block output-success"><span>STDOUT</span><pre>{stdout}</pre></div>
      )}
      {stderr && (
        <div className="output-block output-error"><span>STDERR</span><pre>{stderr}</pre></div>
      )}
    </div>
  )
}
