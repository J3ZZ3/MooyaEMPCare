import LoginPage from '../LoginPage';

export default function LoginPageExample() {
  const handleLogin = () => console.log('Login clicked');

  return <LoginPage onLogin={handleLogin} />;
}