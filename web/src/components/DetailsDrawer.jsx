import React from 'react'

export default function DetailsDrawer({node}){
  if(!node) return (
    <div className="p-3 text-sm text-gray-400">Select a node to see details.</div>
  )

  return (
    <div className="p-3">
      <h3 className="font-semibold text-lg">{node.label}</h3>
      <p className="text-sm text-gray-300 mt-2">{node.title}</p>
      <div className="mt-3 text-sm text-gray-400">
        <div><strong>Node ID:</strong> {node.id}</div>
        <div className="mt-2"><strong>Color:</strong> <span style={{background:node.color?.background}} className="inline-block w-4 h-4 align-middle mr-2 rounded-sm"></span>{node.color?.background}</div>
      </div>
      <div className="mt-4">
        <button className="px-3 py-2 bg-gray-800 text-sm rounded">Open logs</button>
        <button className="ml-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-sm rounded">Inspect</button>
      </div>
    </div>
  )
}
