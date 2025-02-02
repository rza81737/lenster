import '@sentry/tracing';

import response from '@lenster/lib/response';
import createSupabaseClient from '@lenster/supabase/createSupabaseClient';

import { VERIFIED_KV_KEY } from '../constants';
import type { WorkerRequest } from '../types';

export default async (request: WorkerRequest) => {
  const transaction = request.sentry?.startTransaction({
    name: '@lenster/preferences/getVerified'
  });

  try {
    const cache = await request.env.PREFERENCES.get(VERIFIED_KV_KEY);

    if (!cache) {
      const client = createSupabaseClient(request.env.SUPABASE_KEY);

      const { data } = await client
        .from('rights')
        .select('id')
        .eq('is_verified', true);

      const ids = data?.map((right) => right.id);
      await request.env.PREFERENCES.put(VERIFIED_KV_KEY, JSON.stringify(ids));

      return response({ success: true, result: ids });
    }

    return response({ success: true, fromKV: true, result: JSON.parse(cache) });
  } catch (error) {
    request.sentry?.captureException(error);
    throw error;
  } finally {
    transaction?.finish();
  }
};
