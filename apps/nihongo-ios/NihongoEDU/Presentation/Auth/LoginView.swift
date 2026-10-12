import SwiftUI

struct LoginView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthState.self) private var authState

    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var kcLoading = false
    @State private var errorMessage: String?

    private var busy: Bool { loading || kcLoading }

    var body: some View {
        Form {
            Section {
                Button {
                    Task { await loginKeycloak() }
                } label: {
                    HStack {
                        Spacer()
                        if kcLoading {
                            ProgressView()
                        } else {
                            Text("Đăng nhập Keycloak")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(busy)
                .listRowBackground(Color.teal.opacity(0.15))
            }

            Section("Dev login (email / mật khẩu)") {
                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                SecureField("Mật khẩu", text: $password)

                Button {
                    Task { await loginEmail() }
                } label: {
                    HStack {
                        Spacer()
                        if loading {
                            ProgressView()
                        } else {
                            Text("Đăng nhập")
                                .fontWeight(.semibold)
                        }
                        Spacer()
                    }
                }
                .disabled(busy || email.isEmpty || password.isEmpty)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                        .font(.footnote)
                }
            }
        }
        .navigationTitle("Đăng nhập")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func loginEmail() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            try await AuthAPI().login(email: email.trimmingCharacters(in: .whitespaces), password: password)
            authState.refresh()
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }

    private func loginKeycloak() async {
        kcLoading = true
        errorMessage = nil
        defer { kcLoading = false }
        do {
            let tokens = try await KeycloakAuth().login()
            // Refresh token của Keycloak không cần lưu: app dùng refresh token của gateway (cookie)
            try await AuthAPI().loginOidc(accessToken: tokens.accessToken, idToken: tokens.idToken)
            authState.refresh()
            dismiss()
        } catch {
            errorMessage = error.userMessage
        }
    }
}
