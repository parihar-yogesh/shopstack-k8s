import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CURRENT_USER_KEY } from '../auth/useCurrentUser';
import { AuthForm } from '../components/AuthForm';
import { register, type User } from '../lib/api';
import { authErrorMessage } from '../lib/authErrors';

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      register(email, password),
    onSuccess: (user: User) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
      void navigate('/');
    },
  });

  return (
    <AuthForm
      title="Create an account"
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      passwordHint="At least 10 characters."
      pending={mutation.isPending}
      error={mutation.error ? authErrorMessage(mutation.error) : null}
      onSubmit={(email, password) => mutation.mutate({ email, password })}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="text-stone-900 underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    />
  );
}