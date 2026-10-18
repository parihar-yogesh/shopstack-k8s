import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CURRENT_USER_KEY } from '../auth/useCurrentUser';
import { useRedirectTarget } from '../auth/useRedirectTarget';
import { AuthForm } from '../components/AuthForm';
import { login, type User } from '../lib/api';
import { authErrorMessage } from '../lib/authErrors';

export function SignInPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const target = useRedirectTarget();

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (user: User) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
      void navigate(target, { replace: true });
    },
  });

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      passwordAutoComplete="current-password"
      pending={mutation.isPending}
      error={mutation.error ? authErrorMessage(mutation.error) : null}
      onSubmit={(email, password) => mutation.mutate({ email, password })}
      footer={
        <>
          No account yet?{' '}
          <Link
            to="/register"
            state={{ from: target }}
            className="text-stone-900 underline underline-offset-4"
          >
            Create one
          </Link>
        </>
      }
    />
  );
}