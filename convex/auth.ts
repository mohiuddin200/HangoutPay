import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

declare const process: { env: Record<string, string | undefined> };

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    redirect: (async ({ redirectTo }: { redirectTo: string }): Promise<string> => {
      return redirectTo;
    }) as unknown as (params: { redirectTo: string }) => Promise<string>,
  },
});
