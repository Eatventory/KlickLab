import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="https://video-public.canva.com/VAE_P6w0_yY/v/25052dae9b.mp4" type="video/mp4" />
      </video>

      <div className="relative z-10 flex justify-center items-center w-full h-full">
        <LoginForm />
      </div>
    </div>
  );
}
