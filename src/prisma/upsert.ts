import type { Collection } from "@prisma/orm-postgres/orm-client";
import type { Contract, models } from "./contract.js";

/**
 * The rows of every model, keyed by model name.
 */
type ModelRows = typeof models.public;

/**
 * A column's value type, minus `null` — a conflict criterion always names a
 * value that exists.
 */
type ColumnValue<M extends keyof ModelRows, K extends keyof ModelRows[M]> = Exclude<
  ModelRows[M][K],
  null
>;

/**
 * The conflict criteria `upsert` accepts per model, one per unique index.
 *
 * `contract infer` adopts the live database's uniqueness faithfully, and this
 * database — created by Prisma 7 — carries it as unique *indexes*
 * (`Guild_discordId_key`, `Booster_userId_guildId_key`,
 * `CustomRole_boosterId_key`, `CustomRole_discordRoleId_key`,
 * `GuildSetting_gid_key`) rather than as unique *constraints*. PostgreSQL
 * treats both the same for `ON CONFLICT`, and the Prisma 8 runtime resolves
 * `conflictOn` straight to the named columns, so these targets work at
 * runtime. Only the *type* of `conflictOn` is narrower than that: it accepts
 * the primary key and the unique constraints (`storage.uniques`), which this
 * database has none of.
 *
 * `upsertOnUniqueIndex` widens the criterion to the unique indexes while
 * keeping the column names and their value types checked.
 */
export type UniqueIndexConflictMap = {
  Guild: {
    discordId: ColumnValue<"Guild", "discordId">;
  };
  Booster: {
    userId: ColumnValue<"Booster", "userId">;
    guildId: ColumnValue<"Booster", "guildId">;
  };
  /**
   * `CustomRole` has two unique indexes, so a criterion names one of them.
   * The `never` markers keep the two apart: a criterion that mixes the
   * columns of both indexes matches neither and is rejected.
   */
  CustomRole:
    | {
        boosterId: ColumnValue<"CustomRole", "boosterId">;
        discordRoleId?: never;
      }
    | {
        discordRoleId: ColumnValue<"CustomRole", "discordRoleId">;
        boosterId?: never;
      };
  GuildSetting: {
    gid: ColumnValue<"GuildSetting", "gid">;
  };
};

export type UniqueIndexModel = keyof UniqueIndexConflictMap;

type ModelOf<T> = T extends Collection<Contract, infer M, any, any>
  ? M & UniqueIndexModel
  : never;

type UpsertInputOf<T> = T extends { upsert(input: infer I): unknown }
  ? I
  : never;

type UpsertCreateOf<T> = UpsertInputOf<T> extends { create: infer C } ? C : never;

type UpsertUpdateOf<T> = UpsertInputOf<T> extends { update: infer U } ? U : never;

type UpsertResultOf<T> = T extends { upsert(...args: any[]): infer R }
  ? Awaited<R>
  : never;

/**
 * The collection's `upsert`, widened so that one model can be written once
 * instead of once per model. `bind` keeps the collection as the receiver.
 */
type WidenedUpsert = (input: {
  create: unknown;
  update: unknown;
  conflictOn?: unknown;
}) => Promise<unknown>;

/**
 * `upsert` with a conflict target on a unique index.
 *
 * Same semantics as `collection.upsert(...)`: the row is inserted when the
 * target does not exist yet and updated when it does, in a single statement.
 */
export async function upsertOnUniqueIndex<
  T extends Collection<Contract, UniqueIndexModel, any, any>,
>(
  collection: T,
  input: {
    create: UpsertCreateOf<T>;
    update: UpsertUpdateOf<T>;
    conflictOn: UniqueIndexConflictMap[ModelOf<T>];
  },
): Promise<UpsertResultOf<T>> {
  const upsert = collection.upsert.bind(collection) as unknown as WidenedUpsert;
  return upsert({
    ...input,
    conflictOn: input.conflictOn,
  }) as Promise<UpsertResultOf<T>>;
}
