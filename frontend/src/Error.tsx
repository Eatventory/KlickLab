import { Link } from 'react-router-dom';

export default function Error() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      <h1 className="text-6xl font-bold text-blue-500 mb-2">Oops!</h1>
      <p className="text-xl text-gray-700 italic mb-6">Something went wrong.</p>
      <Link to='/'>
        <p className="text-lg text-gray-400 hover:text-gray-600 underline cursor-pointer mt-6">
          Back to the main page
        </p>
      </Link>
    </div>
  );
}
