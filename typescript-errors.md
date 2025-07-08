# TypeScript Errors

```
src/components/realtime/online-users.tsx(68,34): error TS2345: Argument of type '(user: Record<string, unknown>, index: number) => Element' is not assignable to parameter of type '(value: unknown, index: number, array: unknown[]) => Element'.
  Types of parameters 'user' and 'value' are incompatible.
    Type 'unknown' is not assignable to type 'Record<string, unknown>'.
src/components/realtime/online-users.tsx(98,40): error TS2345: Argument of type '(user: Record<string, unknown>, index: number) => Element' is not assignable to parameter of type '(value: unknown, index: number, array: unknown[]) => Element'.
  Types of parameters 'user' and 'value' are incompatible.
    Type 'unknown' is not assignable to type 'Record<string, unknown>'.
src/components/realtime/session-status.tsx(128,56): error TS2322: Type '{ className: string; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
  Property 'title' does not exist on type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/realtime/session-status.tsx(130,57): error TS2322: Type '{ className: string; title: string; }' is not assignable to type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
  Property 'title' does not exist on type 'IntrinsicAttributes & Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>'.
src/components/settings/language-settings-card.tsx(57,17): error TS2345: Argument of type 'string' is not assignable to parameter of type 'RouteImpl<string>'.
src/components/settings/notification-settings-card.tsx(153,16): error TS2352: Conversion of type '{ enabled: boolean; sessionReminders: boolean; sessionUpdates: boolean; messageNotifications: boolean; marketing: boolean; weeklyDigest: boolean; frequency: "daily" | "immediate" | "hourly"; } | { ...; } | { ...; } | { ...; }' to type 'Record<string, Record<string, string | boolean>>' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ language: string; timezone: string; reminderTiming: number; }' is not comparable to type 'Record<string, Record<string, string | boolean>>'.
    Property 'language' is incompatible with index signature.
      Type 'string' is not comparable to type 'Record<string, string | boolean>'.
src/components/settings/preferences-settings-card.tsx(53,17): error TS2345: Argument of type 'string' is not assignable to parameter of type 'RouteImpl<string>'.
src/components/settings/settings-page.tsx(126,44): error TS2345: Argument of type 'string' is not assignable to parameter of type 'RouteImpl<string>'.
src/hooks/use-language-switcher.ts(46,17): error TS2345: Argument of type 'string' is not assignable to parameter of type 'RouteImpl<string>'.
src/i18n/request.ts(4,33): error TS2345: Argument of type '({ locale }: GetRequestConfigParams) => Promise<{ messages: any; }>' is not assignable to parameter of type '(params: GetRequestConfigParams) => RequestConfig | Promise<RequestConfig>'.
  Type 'Promise<{ messages: any; }>' is not assignable to type 'RequestConfig | Promise<RequestConfig>'.
    Type 'Promise<{ messages: any; }>' is not assignable to type 'Promise<RequestConfig>'.
      Type '{ messages: any; }' is not assignable to type 'RequestConfig'.
        Property 'locale' is missing in type '{ messages: any; }' but required in type '{ locale: string; }'.
src/lib/auth/auth-context.tsx(61,29): error TS2339: Property 'is_active' does not exist on type '{ id: string; email: string; role: "client" | "coach" | "admin"; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; timezone: string; ... 4 more ...; updated_at: string; }'.
src/lib/auth/auth-context.tsx(62,11): error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.
src/lib/auth/auth-context.tsx(63,32): error TS2339: Property 'phone_number' does not exist on type '{ id: string; email: string; role: "client" | "coach" | "admin"; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; timezone: string; ... 4 more ...; updated_at: string; }'.
src/lib/auth/auth-context.tsx(64,32): error TS2339: Property 'date_of_birth' does not exist on type '{ id: string; email: string; role: "client" | "coach" | "admin"; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; timezone: string; ... 4 more ...; updated_at: string; }'.
src/lib/auth/auth-context.tsx(65,32): error TS2339: Property 'preferences' does not exist on type '{ id: string; email: string; role: "client" | "coach" | "admin"; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; timezone: string; ... 4 more ...; updated_at: string; }'.
src/lib/auth/auth-context.tsx(74,29): error TS2339: Property 'metadata' does not exist on type '{ id: string; email: string; role: "client" | "coach" | "admin"; first_name: string | null; last_name: string | null; phone: string | null; avatar_url: string | null; timezone: string; ... 4 more ...; updated_at: string; }'.
src/lib/auth/auth.ts(343,41): error TS2345: Argument of type '{ token_hash: string; type: string; }' is not assignable to parameter of type 'VerifyOtpParams'.
  Type '{ token_hash: string; type: string; }' is not assignable to type 'VerifyTokenHashParams'.
    Types of property 'type' are incompatible.
      Type 'string' is not assignable to type 'EmailOtpType'.
src/lib/database/users.ts(264,39): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/database/users.ts(265,47): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/database/users.ts(266,45): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/database/users.ts(295,39): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/database/users.ts(296,47): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/database/users.ts(297,45): error TS2339: Property 'count' does not exist on type '{ id: string; }[]'.
src/lib/monitoring/sentry.ts(13,7): error TS2353: Object literal may only specify known properties, and 'tracingOrigins' does not exist in type 'Partial<BrowserTracingOptions>'.
src/lib/monitoring/sentry.ts(20,14): error TS7006: Parameter 'event' implicitly has an 'any' type.
src/lib/monitoring/sentry.ts(42,33): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Context | null'.
src/lib/monitoring/sentry.ts(76,19): error TS2339: Property 'startTransaction' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/node_modules/@sentry/nextjs/build/types/index.types")'.
src/lib/monitoring/sentry.ts(105,7): error TS2322: Type 'ComponentType<{ error?: Error | undefined; }> | (() => DetailedReactHTMLElement<HTMLAttributes<HTMLElement>, HTMLElement>)' is not assignable to type 'ReactElement<unknown, string | JSXElementConstructor<any>> | FallbackRender | undefined'.
  Type 'ComponentClass<{ error?: Error | undefined; }, any>' is not assignable to type 'ReactElement<unknown, string | JSXElementConstructor<any>> | FallbackRender | undefined'.
src/lib/notifications/email-service.ts(110,83): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number'.
src/lib/notifications/email-service.ts(157,88): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number'.
src/lib/notifications/email-service.ts(158,90): error TS2769: No overload matches this call.
  Overload 1 of 4, '(value: string | number | Date): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number | Date'.
  Overload 2 of 4, '(value: string | number): Date', gave the following error.
    Argument of type '{}' is not assignable to parameter of type 'string | number'.
src/lib/performance/optimization.ts(258,5): error TS2322: Type 'Promise<unknown>' is not assignable to type 'Promise<T>'.
  Type 'unknown' is not assignable to type 'T'.
    'T' could be instantiated with an arbitrary type which could be unrelated to 'unknown'.
src/lib/performance/web-vitals.ts(162,5): error TS2353: Object literal may only specify known properties, and 'entries' does not exist in type '{ name: string; value: number; rating: string; delta: number; }'.
src/lib/realtime/realtime-client.ts(6,99): error TS2344: Type 'T' does not satisfy the constraint '{ [key: string]: any; }'.
src/lib/security/audit.ts(332,18): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
  No index signature with a parameter of type 'string' was found on type '{}'.
src/lib/security/audit.ts(333,21): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{}'.
  No index signature with a parameter of type 'string' was found on type '{}'.
src/lib/security/rate-limit.ts(31,60): error TS2339: Property 'ip' does not exist on type 'NextRequest'.
src/lib/supabase/server.ts(29,10): error TS2769: No overload matches this call.
  Overload 1 of 2, '(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<"public"> & { cookieOptions?: CookieOptionsWithName | undefined; cookies: CookieMethodsServerDeprecated; cookieEncoding?: "raw" | ... 1 more ... | undefined; }): SupabaseClient<...>', gave the following error.
    Type '(name: string, value: string, options: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "strict" | "lax" | "none"; path?: string; }) => void' is not assignable to type 'SetCookie'.
      Types of parameters 'options' and 'options' are incompatible.
        Type 'Partial<SerializeOptions>' is not assignable to type '{ maxAge?: number | undefined; httpOnly?: boolean | undefined; secure?: boolean | undefined; sameSite?: "strict" | "lax" | "none" | undefined; path?: string | undefined; }'.
          Types of property 'sameSite' are incompatible.
            Type 'boolean | "strict" | "lax" | "none" | undefined' is not assignable to type '"strict" | "lax" | "none" | undefined'.
              Type 'false' is not assignable to type '"strict" | "lax" | "none" | undefined'.
  Overload 2 of 2, '(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<"public"> & { cookieOptions?: CookieOptionsWithName | undefined; cookies: CookieMethodsServer; cookieEncoding?: "raw" | ... 1 more ... | undefined; }): SupabaseClient<...>', gave the following error.
    Object literal may only specify known properties, and 'get' does not exist in type 'CookieMethodsServer'.
src/lib/supabase/server.ts(70,10): error TS2769: No overload matches this call.
  Overload 1 of 2, '(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<"public"> & { cookieOptions?: CookieOptionsWithName | undefined; cookies: CookieMethodsServerDeprecated; cookieEncoding?: "raw" | ... 1 more ... | undefined; }): SupabaseClient<...>', gave the following error.
    Type '(name: string, value: string, options: { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: "strict" | "lax" | "none"; path?: string; }) => void' is not assignable to type 'SetCookie'.
      Types of parameters 'options' and 'options' are incompatible.
        Type 'Partial<SerializeOptions>' is not assignable to type '{ maxAge?: number | undefined; httpOnly?: boolean | undefined; secure?: boolean | undefined; sameSite?: "strict" | "lax" | "none" | undefined; path?: string | undefined; }'.
          Types of property 'sameSite' are incompatible.
            Type 'boolean | "strict" | "lax" | "none" | undefined' is not assignable to type '"strict" | "lax" | "none" | undefined'.
              Type 'false' is not assignable to type '"strict" | "lax" | "none" | undefined'.
  Overload 2 of 2, '(supabaseUrl: string, supabaseKey: string, options: SupabaseClientOptions<"public"> & { cookieOptions?: CookieOptionsWithName | undefined; cookies: CookieMethodsServer; cookieEncoding?: "raw" | ... 1 more ... | undefined; }): SupabaseClient<...>', gave the following error.
    Object literal may only specify known properties, and 'get' does not exist in type 'CookieMethodsServer'.
src/test/api/notifications.test.ts(54,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(86,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(111,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(148,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(218,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(226,21): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Promise<{ id: string; }>'.
src/test/api/notifications.test.ts(237,7): error TS2304: Cannot find name 'NotificationService'.
src/test/api/notifications.test.ts(245,21): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Promise<{ id: string; }>'.
src/test/api/notifications.test.ts(264,21): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Promise<{ id: string; }>'.
src/test/api/sessions.test.ts(55,7): error TS2304: Cannot find name 'SessionService'.
src/test/api/sessions.test.ts(59,7): error TS2304: Cannot find name 'validateRequestBody'.
src/test/api/sessions.test.ts(116,7): error TS2304: Cannot find name 'validateRequestBody'.
src/test/api/sessions.test.ts(134,7): error TS2304: Cannot find name 'SessionService'.
src/test/api/sessions.test.ts(139,7): error TS2304: Cannot find name 'SessionNotificationService'.
src/test/api/sessions.test.ts(143,7): error TS2304: Cannot find name 'validateRequestBody'.
src/test/api/sessions.test.ts(183,7): error TS2304: Cannot find name 'SessionService'.
src/test/api/sessions.test.ts(208,7): error TS2304: Cannot find name 'SessionService'.
src/test/api/sessions.test.ts(241,7): error TS2304: Cannot find name 'SessionService'.
src/test/components/notifications/notification-center.test.tsx(61,7): error TS2345: Argument of type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: { id: string; userId: string; type: "session_reminder"; title: string; message: string; data: { sessionId: string; }; readAt: null; createdAt: string; updatedAt: string; }[]; pagination: { ...; }; }; refetch: Mock<...>; }' is not assignable to parameter of type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: { id: string; userId: string; type: "session_reminder"; title: string; message: string; data: { sessionId: string; }; readAt: null; createdAt: string; updatedAt: string; }[]; pagination: { ...; }; }; refetch: Mock<...>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: { id: string; userId: string; type: "session_reminder"; title: string; message: string; data: { sessionId: string; }; readAt: null; createdAt: string; updatedAt: string; }[]; pagination: { ...; }; }; refetch: Mock<...>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/notifications/notification-center.test.tsx(69,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/notifications/notification-center.test.tsx(100,7): error TS2345: Argument of type '{ isLoading: boolean; isError: boolean; error: Error | null; data: null; refetch: Mock<Procedure>; }' is not assignable to parameter of type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: null; refetch: Mock<Procedure>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: null; refetch: Mock<Procedure>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/notifications/notification-center.test.tsx(119,7): error TS2345: Argument of type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: never[]; pagination: { page: number; limit: number; total: number; unreadCount: number; }; }; refetch: Mock<Procedure>; }' is not assignable to parameter of type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: never[]; pagination: { page: number; limit: number; total: number; unreadCount: number; }; }; refetch: Mock<Procedure>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { data: never[]; pagination: { page: number; limit: number; total: number; unreadCount: number; }; }; refetch: Mock<Procedure>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/notifications/notification-center.test.tsx(140,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/notifications/notification-center.test.tsx(164,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/notifications/notification-center.test.tsx(188,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/sessions/session-booking-form.test.tsx(63,37): error TS2322: Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string; avatarUrl?: string; ... 5 more ...; lastSeenAt?: string; }[]; refetch: Mock<...>; }' is not assignable to type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string; avatarUrl?: string; ... 5 more ...; lastSeenAt?: string; }[]; refetch: Mock<...>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string | undefined; ... 6 more ...; lastSeenAt?: string | undefined; }[]; refetch: Mock<...>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/sessions/session-booking-form.test.tsx(65,37): error TS2322: Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is not assignable to type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/sessions/session-booking-form.test.tsx(68,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/sessions/session-booking-form.test.tsx(132,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/sessions/session-booking-form.test.tsx(182,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/sessions/session-booking-form.test.tsx(198,7): error TS2345: Argument of type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to parameter of type 'UseMutationResult<unknown, unknown, unknown, unknown>'.
  Type '{ mutate: ReturnType<typeof vi.fn>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is not assignable to type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<unknown, unknown, unknown, unknown>; }'.
    Type '{ mutate: Mock<Procedure>; isPending: boolean; isError: boolean; error: Error | null; mutateAsync: Mock<Procedure>; data: unknown; }' is missing the following properties from type 'Override<MutationObserverSuccessResult<unknown, unknown, unknown, unknown>, { mutate: UseMutateFunction<unknown, unknown, unknown, unknown>; }>': variables, isIdle, isSuccess, status, and 6 more.
src/test/components/sessions/session-booking-form.test.tsx(225,37): error TS2322: Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string; avatarUrl?: string; ... 5 more ...; lastSeenAt?: string; }[]; refetch: Mock<...>; }' is not assignable to type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string; avatarUrl?: string; ... 5 more ...; lastSeenAt?: string; }[]; refetch: Mock<...>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; firstName: string; lastName: string; email: string; role: UserRole; phone?: string | undefined; ... 6 more ...; lastSeenAt?: string | undefined; }[]; refetch: Mock<...>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/components/sessions/session-booking-form.test.tsx(226,37): error TS2322: Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is not assignable to type 'UseQueryResult<unknown, unknown>'.
  Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is not assignable to type 'QueryObserverRefetchErrorResult<unknown, unknown> | QueryObserverSuccessResult<unknown, unknown> | QueryObserverPlaceholderResult<unknown, unknown>'.
    Type '{ isLoading: boolean; isError: boolean; error: Error | null; data: { id: string; coachId: string; date: string; startTime: string; endTime: string; isAvailable: boolean; }[]; refetch: Mock<Procedure>; }' is missing the following properties from type 'QueryObserverPlaceholderResult<unknown, unknown>': isPending, isLoadingError, isRefetchError, isSuccess, and 16 more.
src/test/integration/auth-flow.test.tsx(159,44): error TS2345: Argument of type '{ role: string; id: string; email: string; firstName?: string; lastName?: string; phone?: string; avatarUrl?: string; timezone?: string; language: Language; status: UserStatus; createdAt: string; updatedAt: string; lastSeenAt?: string; }' is not assignable to parameter of type 'AuthUser'.
  Types of property 'role' are incompatible.
    Type 'string' is not assignable to type 'UserRole'.
src/test/integration/auth-flow.test.tsx(173,44): error TS2345: Argument of type 'undefined' is not assignable to parameter of type 'AuthUser | null'.
src/test/integration/auth-flow.test.tsx(270,16): error TS18046: 'error' is of type 'unknown'.
src/test/integration/session-booking.test.tsx(89,52): error TS2345: Argument of type 'Mock<() => { invalidateQueries: Mock<Procedure>; setQueryData: Mock<Procedure>; }>' is not assignable to parameter of type 'NormalizedProcedure<(queryClient?: QueryClient | undefined) => QueryClient>'.
  Type '{ invalidateQueries: Mock<Procedure>; setQueryData: Mock<Procedure>; }' is missing the following properties from type 'QueryClient': #private, mount, unmount, isFetching, and 27 more.
src/test/integration/session-booking.test.tsx(316,54): error TS2345: Argument of type 'Mock<() => { invalidateQueries: Mock<Procedure>; }>' is not assignable to parameter of type 'NormalizedProcedure<(queryClient?: QueryClient | undefined) => QueryClient>'.
  Type '{ invalidateQueries: Mock<Procedure>; }' is missing the following properties from type 'QueryClient': #private, mount, unmount, isFetching, and 28 more.
src/test/lib/database/sessions.test.ts(95,9): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'GetSessionsOptions'.
src/test/lib/database/sessions.test.ts(120,9): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'GetSessionsOptions'.
src/test/lib/database/sessions.test.ts(139,9): error TS2353: Object literal may only specify known properties, and 'startDate' does not exist in type 'GetSessionsOptions'.
src/test/lib/database/sessions.test.ts(157,9): error TS2353: Object literal may only specify known properties, and 'page' does not exist in type 'GetSessionsOptions'.
src/test/lib/database/sessions.test.ts(269,67): error TS2554: Expected 1 arguments, but got 2.
src/test/performance.test.ts(34,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(45,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(87,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(96,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(115,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(211,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(263,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/performance.test.ts(313,45): error TS2307: Cannot find module '../../../next.config.js' or its corresponding type declarations.
src/test/production-readiness.test.ts(142,42): error TS2339: Property 'from' does not exist on type 'Promise<SupabaseClient<Database, "public" extends keyof Database ? "public" : string & keyof Database, Database[SchemaName] extends GenericSchema ? Database[SchemaName] : any>>'.
src/test/security.test.ts(13,15): error TS2339: Property 'sanitizeInput' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/src/lib/security/validation")'.
src/test/security.test.ts(23,15): error TS2339: Property 'containsSQLInjection' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/src/lib/security/validation")'.
src/test/security.test.ts(39,15): error TS2339: Property 'containsXSS' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/src/lib/security/validation")'.
src/test/security.test.ts(139,40): error TS2345: Argument of type '"notes:create"' is not assignable to parameter of type 'Permission'.
src/test/security.test.ts(176,15): error TS2339: Property 'RATE_LIMITS' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/src/lib/security/rate-limit")'.
src/test/security.test.ts(204,15): error TS2339: Property 'validateApiInput' does not exist on type 'typeof import("/Users/tomergalansky/Desktop/loom-app/src/lib/api/validation")'.
src/test/security.test.ts(278,46): error TS2307: Cannot find module '../../../package.json' or its corresponding type declarations.
src/test/security.test.ts(285,46): error TS2307: Cannot find module '../../../package.json' or its corresponding type declarations.
src/test/utils.tsx(20,3): error TS2322: Type 'null' is not assignable to type 'string | undefined'.
```
