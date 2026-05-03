export function AISuggestionsSimple() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI Suggestions Test</h1>
      
      <div className="space-y-4">
        {/* Test Button 1 */}
        <button
          onClick={() => alert('Button 1 clicked!')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg font-bold"
        >
          TEST BUTTON 1 - Click Me
        </button>

        {/* Test Button 2 */}
        <button
          onClick={() => {
            console.log('Button 2 clicked');
            alert('Button 2 works!');
          }}
          className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-lg font-bold"
        >
          TEST BUTTON 2 - Click Me
        </button>

        {/* Test Button 3 */}
        <button
          onClick={() => {
            const result = confirm('Do you want to test this button?');
            alert(result ? 'You clicked OK!' : 'You clicked Cancel!');
          }}
          className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-lg font-bold"
        >
          TEST BUTTON 3 - Click Me
        </button>

        <div className="mt-8 p-4 bg-yellow-100 border-2 border-yellow-500 rounded">
          <p className="font-bold">Instructions:</p>
          <p>1. Click each button above</p>
          <p>2. You should see alerts</p>
          <p>3. Check browser console (F12) for logs</p>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
