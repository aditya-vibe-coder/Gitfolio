const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function leetcodeHandler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username) {
    return new Response(JSON.stringify({ error: 'username required' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  const query = `
    query userPublicProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum { difficulty count submissions }
        }
        profile { ranking reputation }
        badges { id name icon }
        userCalendar { streak totalActiveDays submissionCalendar }
      }
      userContestRanking(username: $username) {
        attendedContestsCount rating globalRanking badge { name }
      }
    }
  `;

  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!res.ok) throw new Error(`LeetCode returned ${res.status}`);
    const data = await res.json();

    const matched = data?.data?.matchedUser;
    const contest = data?.data?.userContestRanking;
    if (!matched) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    const acStats = matched.submitStats?.acSubmissionNum || [];
    const easy = acStats.find(s => s.difficulty === 'Easy')?.count || 0;
    const medium = acStats.find(s => s.difficulty === 'Medium')?.count || 0;
    const hard = acStats.find(s => s.difficulty === 'Hard')?.count || 0;
    const total = easy + medium + hard;

    return new Response(JSON.stringify({
      username: matched.username,
      easy, medium, hard, total,
      ranking: matched.profile?.ranking || null,
      reputation: matched.profile?.reputation || null,
      streak: matched.userCalendar?.streak || 0,
      totalActiveDays: matched.userCalendar?.totalActiveDays || 0,
      submissionCalendar: matched.userCalendar?.submissionCalendar || null,
      badges: matched.badges || [],
      contestRating: contest?.rating || null,
      attendedContests: contest?.attendedContestsCount || 0,
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
}

export async function codeforcesHandler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');
  if (!handle) {
    return new Response(JSON.stringify({ error: 'handle required' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }

  try {
    const [infoRes, ratingRes] = await Promise.all([
      fetch(`https://codeforces.com/api/user.info?handles=${handle}`),
      fetch(`https://codeforces.com/api/user.rating?handle=${handle}`),
    ]);

    const infoData = await infoRes.json();
    const ratingData = await ratingRes.json();

    if (infoData.status !== 'OK') throw new Error(infoData.comment || 'CF API error');
    const user = infoData.result[0];

    const ratingHistory = ratingData.status === 'OK' ? ratingData.result : [];

    return new Response(JSON.stringify({
      handle: user.handle,
      rating: user.rating,
      maxRating: user.maxRating,
      rank: user.rank,
      maxRank: user.maxRank,
      avatar: user.titlePhoto,
      contribution: user.contribution,
      friendOfCount: user.friendOfCount,
      ratingHistory: ratingHistory.map(r => ({ contestId: r.contestId, rating: r.newRating, rank: r.rank })),
    }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
}
