export default async function handler(req, res) {
  try {
    const apiKey =
      process.env.VITE_CRM_API_KEY ||
      process.env.CRM_API_KEY ||
      'nxk_live_jie3Zro3Fg4f9pRgdZDnwAK3';

    const targetUrl = 'https://dashboard.wacommerce.id/api/public/v1/orders';

    const fetchRes = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    const data = await fetchRes.text();
    res.statusCode = fetchRes.status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.end(data);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(
      JSON.stringify({
        ok: false,
        error: err && err.message ? err.message : 'Failed to fetch orders from WACOMMERCE',
      })
    );
  }
}
