import Foundation

/// Dựng request cho các API cũ dùng `[String: Any]`. Token không gắn ở đây nữa: `APIClient.send`
/// gắn token và xử lý 401 (refresh rồi gửi lại).
enum HTTPClient {
    static func authorizedRequest(
        url: URL,
        method: String = "GET",
        jsonBody: [String: Any]? = nil
    ) throws -> URLRequest {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let jsonBody {
            req.httpBody = try JSONSerialization.data(withJSONObject: jsonBody)
        }
        return req
    }

    static func decodeJSONObject(data: Data) throws -> Any {
        try JSONSerialization.jsonObject(with: data)
    }

    static func unwrapDataField(_ json: [String: Any]) -> Any? {
        var field = json["data"]
        if let nested = field as? [String: Any], nested["data"] != nil {
            field = nested["data"]
        }
        return field
    }
}
