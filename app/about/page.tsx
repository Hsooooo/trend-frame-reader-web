import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소개 | Trend Frame",
  description: "Trend Frame은 AI가 큐레이팅하는 IT 트렌드 피드 서비스입니다."
};

export default function AboutPage() {
  return (
    <main>
      <div className="static-page">
        <h1>Trend Frame 소개</h1>
        <p className="static-page-lead">
          AI가 매일 IT 트렌드를 수집·요약해 드리는 개인 피드 서비스입니다.
        </p>

        <h2>서비스 개요</h2>
        <p>
          Trend Frame은 국내외 주요 IT 뉴스·블로그 소스를 자동으로 수집하고,
          GPT 기반 AI가 내용을 요약·분류하여 핵심 트렌드를 빠르게 파악할 수
          있도록 도와주는 개인 뉴스 리더입니다.
        </p>

        <hr className="static-page-divider" />

        <h2>주요 기능</h2>

        <h2>Feed</h2>
        <p>
          매일 업데이트되는 IT 트렌드 뉴스를 AI 요약과 함께 제공합니다.
          긍부정 톤 분석, 키워드 태그, 원문 링크를 포함합니다.
        </p>

        <h2>Bookmarks</h2>
        <p>
          나중에 다시 읽고 싶은 기사를 저장하고 관리할 수 있습니다.
          Google 로그인 후 이용 가능합니다.
        </p>

        <h2>Q&amp;A</h2>
        <p>
          수집된 피드 데이터를 기반으로 AI에게 IT 트렌드 관련 질문을 할 수
          있습니다. 벡터 검색으로 관련 기사를 찾아 답변을 생성합니다.
        </p>

        <h2>Insights</h2>
        <p>
          기간별 피드 데이터를 분석하여 키워드 빈도, 톤 분포, 주요 주제 등
          트렌드 인사이트를 시각화해서 제공합니다.
        </p>

        <h2>Graph</h2>
        <p>
          키워드 간 연관 관계를 그래프로 시각화합니다. 특정 키워드를 중심으로
          연결된 개념들을 탐색할 수 있습니다.
        </p>

        <hr className="static-page-divider" />

        <h2>문의</h2>
        <p>
          서비스 관련 문의는{" "}
          <a href="/contact">문의 페이지</a>를 이용해 주세요.
        </p>
      </div>
    </main>
  );
}
