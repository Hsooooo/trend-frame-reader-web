import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "문의 | Trend Frame",
  description: "Trend Frame 서비스 문의"
};

export default function ContactPage() {
  return (
    <main>
      <div className="static-page">
        <h1>문의</h1>
        <p className="static-page-lead">
          서비스 관련 문의, 피드백, 버그 신고를 환영합니다.
        </p>

        <h2>이메일 문의</h2>
        <p>
          아래 이메일로 연락 주시면 확인 후 답변 드리겠습니다.
        </p>
        <p>
          <a href="mailto:hansu.l@icloud.com">hansu.l@icloud.com</a>
        </p>

        <hr className="static-page-divider" />

        <h2>문의 시 포함해 주세요</h2>
        <ul>
          <li>문의 유형 (버그 신고 / 기능 제안 / 개인정보 관련 / 기타)</li>
          <li>문제가 발생한 경우, 재현 방법 또는 스크린샷</li>
          <li>사용 중인 브라우저 및 운영체제 (해당 시)</li>
        </ul>

        <hr className="static-page-divider" />

        <h2>개인정보 삭제 요청</h2>
        <p>
          계정 및 개인정보 삭제를 원하시면 동일한 이메일로 요청해 주세요.
          확인 후 지체 없이 처리해 드립니다.
        </p>
      </div>
    </main>
  );
}
