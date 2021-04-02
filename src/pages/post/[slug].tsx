import { GetStaticPaths, GetStaticProps } from 'next';

import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Prismic from '@prismicio/client';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import Link from 'next/link';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  prevPost: { uid: string; title: string };
  nextPost: { uid: string; title: string };
  preview: boolean;
}

export default function Post({
  post,
  prevPost,
  nextPost,
  preview,
}: PostProps): JSX.Element {
  const { isFallback } = useRouter();

  const words = post?.data.content
    .reduce((acc, value) => {
      const { heading } = value;
      const body = RichText.asText(value.body);

      return acc.concat(heading, body);
    }, '')
    .split(' ');

  const readingTime = Math.ceil(words?.length / 200);

  return (
    <>
      <Header />
      {isFallback ? (
        <div>Carregando...</div>
      ) : (
        <>
          <div className={styles.banner}>
            <img src={post?.data.banner.url} alt="banner" />
          </div>
          <main className={styles.container}>
            <article className={styles.content}>
              <h1>{post.data.title}</h1>
              <div className={styles.label}>
                <FiCalendar />
                <time>
                  {format(
                    new Date(post?.first_publication_date),
                    'dd MMM yyyy',
                    {
                      locale: ptBR,
                    }
                  )}
                </time>
                <FiUser />
                <span>{post?.data.author}</span>
                <FiClock />
                <span>{readingTime} min</span>
              </div>
              <div className={styles.editWhen}>
                <span>
                  * editado em
                  <time>
                    {format(
                      new Date(post?.last_publication_date),
                      " dd MMM yyyy, 'às' H:mm",
                      {
                        locale: ptBR,
                      }
                    )}
                  </time>
                </span>
              </div>
              {post.data.content.map(content => (
                <div key={content.heading}>
                  <strong>{content.heading}</strong>
                  {content.body.map(body => (
                    <p key={body.text.length}>{body.text}</p>
                  ))}
                </div>
              ))}
            </article>
            <div className={styles.divider} />
            <div className={styles.postNav}>
              <div>
                {prevPost.uid && (
                  <a href={prevPost.uid}>
                    <p>{prevPost.title}</p>
                    <span>Post anterior</span>
                  </a>
                )}
              </div>
              <div>
                {nextPost.uid && (
                  <a href={nextPost.uid}>
                    <p>{nextPost.title}</p>
                    <span>Próximo post</span>
                  </a>
                )}
              </div>
            </div>
            <Comments />
            {preview && (
              <aside className={styles.preview}>
                <Link href="/api/exit-preview">
                  <a>Sair do modo Preview</a>
                </Link>
              </aside>
            )}
          </main>
        </>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const params = posts.results.map(post => {
    return { params: { slug: post.uid } };
  });

  return {
    paths: params,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  let nextPost = {};
  let prevPost = {};

  if (!preview) {
    const prevPostResponse = await prismic.query(
      Prismic.Predicates.dateBefore(
        'document.first_publication_date',
        response.first_publication_date
      )
    );
    prevPost = {
      uid: prevPostResponse?.results[0]?.uid ?? '',
      title: prevPostResponse?.results[0]?.data.title ?? '',
    };

    const nextPostResponse = await prismic.query(
      Prismic.Predicates.dateAfter(
        'document.first_publication_date',
        response.first_publication_date
      )
    );
    if (nextPostResponse?.results[1]?.uid) {
      nextPost = {
        uid: nextPostResponse?.results[1]?.uid ?? '',
        title: nextPostResponse?.results[1]?.data.title ?? '',
      };
    } else {
      nextPost = {
        uid: nextPostResponse?.results[0]?.uid ?? '',
        title: nextPostResponse?.results[0]?.data.title ?? '',
      };
    }
  }

  const post = {
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
    data: response.data,
    uid: response.uid,
  };

  return {
    props: {
      post,
      nextPost,
      prevPost,
      preview,
    },
  };
};
