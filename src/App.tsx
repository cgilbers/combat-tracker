import { useState } from 'react'
import heroImg from './assets/hero.png'

function App() {
  const [count, setCount] = useState(0)

  return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <img src={heroImg} alt="Hero" className="w-64 h-64 mb-4" />
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to My App</h1>
        <p className="text-lg text-gray-600 mb-4">This is a simple React app using Tailwind CSS.</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setCount(count + 1)}
        >
          Count is: {count}
        </button>
      </div>
  )
}

export default App
