import { GetStaticProps } from 'next';

import Head from 'next/head';
import Link from 'next/link';
import { FiCalendar, FiUser } from 'react-icons/fi';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { getPrismicClient } from '../services/prismic';

import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [pagination, setPagination] = useState<PostPagination>(postsPagination);

  async function handleLoadMorePosts(): Promise<void> {
    const nextPagePromise = await fetch(postsPagination.next_page);

    const nextPagePromiseJson = await nextPagePromise.json();

    const { results } = nextPagePromiseJson;
    const { next_page } = nextPagePromiseJson;

    const newPostPagination: PostPagination = {
      ...pagination,
      next_page,
    };

    results.forEach(post => {
      const newPost: Post = {
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: post.data,
      };

      newPostPagination.results.push(newPost);
    });

    setPagination(newPostPagination);
  }

  return (
    <>
      <Head>
        <title>Home | spacetravelling</title>
      </Head>

      <main className={styles.container}>
        <img src="/logo.svg" alt="logo" />
        <div className={styles.posts}>
          {pagination.results.map(post => (
            <Link key={post.uid} href={`/post/${post.uid}`}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>
                <div>
                  <FiCalendar />
                  <time>
                    {format(
                      new Date(post.first_publication_date),
                      'dd MMM yyyy',
                      { locale: ptBR }
                    )}
                  </time>
                  <FiUser />
                  <span>{post.data.author}</span>
                </div>
              </a>
            </Link>
          ))}
          {pagination.next_page && (
            <button type="button" onClick={handleLoadMorePosts}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  const postsPagination: PostPagination = {
    next_page: postsResponse.next_page,
    results: postsResponse.results.map(post => ({
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: post.data,
    })),
  };

  return {
    props: {
      postsPagination,
    },
  };
};
