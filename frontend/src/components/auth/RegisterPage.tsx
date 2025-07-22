import RegisterForm from './RegisterForm';

export default function RegisterPage() {
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

      <div className="relative z-20 flex items-center justify-center h-full">
        <RegisterForm />
      </div>
    </div>
  );
}
