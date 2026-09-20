export const runtime = "edge";

export async function GET(request: Request) {
  const target = new URL("/driver-recruiting-share-v3.png", request.url);
  return Response.redirect(target, 308);
}
