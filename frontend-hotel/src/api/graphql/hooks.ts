'use client';

import { useQuery } from '@apollo/client/react';
import type { OperationVariables } from '@apollo/client';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';

import {
  StaySearchDocument,
  CanonicalHotelDocument,
  QuoteDocument,
  ReservationLookupDocument,
  MyReservationsDocument,
  HotelExtrasDocument,
  type StaySearchQueryVariables,
  type QuoteQueryVariables,
  type ReservationLookupQueryVariables,
  type HotelExtrasQueryVariables,
} from '@/graphql/generated/graphql';

/**
 * Apollo-backed read hooks for the guest site (API rule: GraphQL = READ).
 * Browser-side components use these instead of calling the transport
 * directly; the normalized Apollo cache is the single read cache.
 *
 * RSC pages keep the server-side helper in services/graphqlClient.ts
 * (stateless server reads, same documents).
 *
 * The options type mirrors the Apollo v4 useQuery options that matter here
 * (variables/skip/fetchPolicy); the inner call casts to the library's own
 * options type, which is a conditional-signature type not expressible as a
 * plain interface.
 */

export interface ReadOptions<TVars> {
  variables?: TVars;
  skip?: boolean;
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'no-cache';
}

function useRunQuery<TData, TVars extends OperationVariables>(
  document: TypedDocumentNode<TData, TVars>,
  options: ReadOptions<OperationVariables>
) {
  // Apollo v4's useQuery options type is a conditional signature; the
  // wrapper deliberately exposes the small, stable ReadOptions shape.
  return useQuery(document as never, options as never);
}

export function useStaySearch(options: ReadOptions<StaySearchQueryVariables>) {
  return useRunQuery(StaySearchDocument, options);
}

export function useCanonicalHotel(options: ReadOptions<OperationVariables> = {}) {
  return useRunQuery(CanonicalHotelDocument, options);
}

export function useQuote(options: ReadOptions<QuoteQueryVariables>) {
  // Money reads never come from the cache — the backend is the source of
  // truth for pricing.
  return useRunQuery(QuoteDocument, { ...options, fetchPolicy: 'no-cache' });
}

export function useReservationLookup(options: ReadOptions<ReservationLookupQueryVariables>) {
  return useRunQuery(ReservationLookupDocument, options);
}

export function useMyReservations(options: ReadOptions<OperationVariables> = {}) {
  return useRunQuery(MyReservationsDocument, options);
}

export function useHotelExtras(options: ReadOptions<HotelExtrasQueryVariables>) {
  return useRunQuery(HotelExtrasDocument, options);
}

/** Generic typed hook for documents without a dedicated wrapper. */
export function useTypedQuery<TData, TVars extends OperationVariables>(
  document: TypedDocumentNode<TData, TVars>,
  options: ReadOptions<TVars>
) {
  return useRunQuery(document, options);
}
