/// Gateway bọc mọi response: `{ "success": true, "data": ..., "timestamp": ... }`.
/// Trả phần `data`; response không bọc thì trả nguyên.
dynamic unwrapEnvelope(dynamic body) {
  if (body is Map && body['success'] == true && body.containsKey('data')) {
    return body['data'];
  }
  return body;
}
