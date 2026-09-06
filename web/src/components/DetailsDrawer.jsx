import React from 'react'

export default function DetailsDrawer({node}){
  if(!node) return (
    <div className="p-3 text-sm text-gray-400">Select a node to see details.</div>
  )

  const raw = node.raw || {}
  const stdout = raw.output || raw.stdout
  const stderr = raw.stderr

  return (
    <div className="p-3">
      <h3 className="font-semibold text-lg">{node.label}</h3>
      <p className="text-sm text-gray-300 mt-2">{node.title}</p>
      <div className="mt-3 text-sm text-gray-400">
        <div><strong>Node ID:</strong> {node.id}</div>
        <div className="mt-2">
          <strong>Color:</strong>{' '}
          <span style={{background:node.color?.background}} className="inline-block w-4 h-4 align-middle mr-2 rounded-sm"></span>
          {node.color?.background}
        </div>
        {raw.returncode != null && <div className="mt-2"><strong>Exit:</strong> {raw.returncode}</div>}
        {raw.elapsed != null && <div className="mt-1"><strong>Elapsed:</strong> {Number(raw.elapsed).toFixed(2)}s</div>}
      </div>
      {stdout && (
        <pre className="mt-3 bg-black p-2 text-xs rounded text-green-200 max-h-40 overflow-auto">{stdout}</pre>
      )}
      {stderr && (
        <pre className="mt-2 bg-black p-2 text-xs rounded text-red-200 max-h-40 overflow-auto">{stderr}</pre>
      )}
    </div>
  )
}
