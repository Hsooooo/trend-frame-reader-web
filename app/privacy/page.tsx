import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | Trend Frame",
  description: "Trend Frame 개인정보처리방침"
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="static-page">
        <h1>개인정보처리방침</h1>
        <p className="static-page-lead">최종 업데이트: 2025년 1월</p>

        <p>
          Trend Frame(이하 "서비스")은 이용자의 개인정보를 중요하게 생각하며,
          아래와 같이 개인정보처리방침을 안내합니다.
        </p>

        <hr className="static-page-divider" />

        <h2>1. 수집하는 개인정보</h2>
        <p>
          서비스는 Google OAuth 로그인 시 다음 정보를 수집합니다.
        </p>
        <ul>
          <li>이름</li>
          <li>이메일 주소</li>
          <li>프로필 사진 URL</li>
        </ul>
        <p>
          로그인하지 않고도 피드 조회 기능을 이용할 수 있으며, 위 정보는
          북마크·피드백·Q&amp;A 등 개인화 기능 제공을 위해서만 사용됩니다.
        </p>

        <hr className="static-page-divider" />

        <h2>2. 개인정보 이용 목적</h2>
        <ul>
          <li>로그인 인증 및 세션 유지</li>
          <li>북마크, 피드백, Q&amp;A 등 개인화 서비스 제공</li>
          <li>서비스 품질 개선 및 통계 분석</li>
        </ul>

        <hr className="static-page-divider" />

        <h2>3. Google AdSense 및 광고 쿠키</h2>
        <p>
          본 서비스는 Google AdSense(게시자 ID: <code>ca-pub-2057329897151119</code>)를
          통해 광고를 제공할 수 있습니다. Google은 광고 제공을 위해 쿠키를
          사용하며, 이 쿠키를 통해 이용자의 이전 방문 정보를 기반으로 맞춤
          광고가 표시될 수 있습니다.
        </p>
        <p>
          Google의 광고 쿠키 사용에 관한 자세한 내용은{" "}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 광고 개인정보처리방침
          </a>
          을 참고하세요.
        </p>
        <p>
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google 광고 설정
          </a>
          페이지에서 맞춤 광고를 비활성화할 수 있습니다.
        </p>

        <hr className="static-page-divider" />

        <h2>4. 제3자 제공</h2>
        <p>
          수집된 개인정보는 법령에 따른 경우를 제외하고 제3자에게 제공하지
          않습니다. Google OAuth 인증은 Google의 개인정보처리방침에 따라
          처리됩니다.
        </p>

        <hr className="static-page-divider" />

        <h2>5. 데이터 보유 기간</h2>
        <p>
          개인정보는 서비스 이용 기간 동안 보유하며, 이용자가 서비스 탈퇴 또는
          개인정보 삭제를 요청하면 지체 없이 삭제합니다.
        </p>

        <hr className="static-page-divider" />

        <h2>6. 이용자 권리</h2>
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 조회 및 수정 요청</li>
          <li>개인정보 삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
        </ul>
        <p>
          권리 행사는{" "}
          <a href="/contact">문의 페이지</a>를 통해 요청하실 수 있습니다.
        </p>

        <hr className="static-page-divider" />

        <h2>7. 문의</h2>
        <p>
          개인정보 관련 문의는{" "}
          <a href="mailto:hansu.l@icloud.com">hansu.l@icloud.com</a>으로
          연락해 주세요.
        </p>
      </div>
    </main>
  );
}
