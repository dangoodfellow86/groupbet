'use client';

import React, { useState, useEffect } from 'react';
import { useStandings } from '@/hooks/useFootballData';
import { Trophy, AlertCircle } from 'lucide-react';

interface LeagueTableProps {
  competitionCode?: string;
  competitionName?: string;
}

export function LeagueTable({ competitionCode = 'PL', competitionName }: LeagueTableProps) {
  const isBoth = competitionCode === 'BOTH';
  const [selectedTab, setSelectedTab] = useState<'PL' | 'ELC'>('PL');

  useEffect(() => {
    if (!isBoth) {
      setSelectedTab(competitionCode === 'ELC' ? 'ELC' : 'PL');
    }
  }, [competitionCode, isBoth]);

  const comp = isBoth ? selectedTab : competitionCode || 'PL';
  const isChampionship = comp === 'ELC';
  const leagueTitle = isBoth
    ? isChampionship
      ? 'Championship'
      : 'Premier League'
    : competitionName || (isChampionship ? 'Championship' : 'Premier League');
  const { data, isLoading, isError, error } = useStandings(comp);
  const table = data?.table || [];

  return (
    <div className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-neutral-100 tracking-tight">
            League Standings
          </h2>
        </div>
        {isBoth ? (
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setSelectedTab('PL')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                selectedTab === 'PL'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              🦁 PL
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('ELC')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer ${
                selectedTab === 'ELC'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              🏆 EFL
            </button>
          </div>
        ) : (
          <span className="text-xs text-neutral-500 font-medium">
            {data?.season ? `${leagueTitle} ${data.season}` : leagueTitle}
          </span>
        )}
      </div>

      {/* Table Content */}
      {isLoading && (
        <div className="p-4 space-y-2 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-8 bg-neutral-800/60 rounded-md" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-4 text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading standings: {error instanceof Error ? error.message : 'Unknown'}</span>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-semibold uppercase text-neutral-500 bg-neutral-950/60 border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Pos</th>
                <th className="py-2.5 px-3">Club</th>
                <th className="py-2.5 px-2 text-center w-8">Pl</th>
                <th className="py-2.5 px-2 text-center w-8">GD</th>
                <th className="py-2.5 px-3 text-center w-10 font-bold text-neutral-300">Pts</th>
                <th className="py-2.5 px-3 text-center w-28 hidden sm:table-cell">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {table.map((row) => {
                const isTopTier = isChampionship ? row.position <= 2 : row.position <= 4;
                const isMidTier = isChampionship ? (row.position >= 3 && row.position <= 6) : row.position === 5;
                const isRelegation = isChampionship ? row.position >= 22 : row.position >= 18;

                const formArray = row.form ? row.form.replace(/,/g, '').split('').slice(-5) : [];

                return (
                  <tr
                    key={row.team.id}
                    className={`hover:bg-neutral-800/40 transition-colors ${
                      isTopTier ? 'border-l-2 border-emerald-500 bg-emerald-950/5' : ''
                    } ${isMidTier ? 'border-l-2 border-blue-500 bg-blue-950/5' : ''} ${
                      isRelegation ? 'border-l-2 border-rose-500 bg-rose-950/5' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-mono font-medium text-neutral-400">
                      {row.position}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        {row.team.crest ? (
                          <img
                            src={row.team.crest}
                            alt={row.team.name}
                            className="w-5 h-5 object-contain shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold">
                            {row.team.tla}
                          </span>
                        )}
                        <span className="font-semibold text-neutral-200 truncate max-w-[120px] sm:max-w-none">
                          {row.team.shortName || row.team.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-neutral-400">
                      {row.playedGames}
                    </td>
                    <td className="py-2 px-2 text-center font-mono text-neutral-400">
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-neutral-100">
                      {row.points}
                    </td>
                    <td className="py-2 px-3 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {formArray.map((res, i) => (
                          <span
                            key={i}
                            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                              res === 'W'
                                ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
                                : res === 'D'
                                ? 'bg-amber-900/80 text-amber-300 border border-amber-700/60'
                                : 'bg-rose-900/80 text-rose-300 border border-rose-700/60'
                            }`}
                          >
                            {res}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend Footer */}
      <div className="p-3 bg-neutral-950/80 border-t border-neutral-800/80 flex flex-wrap items-center gap-4 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>{isChampionship ? 'Automatic Promotion (1-2)' : 'Champions League (1-4)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
          <span>{isChampionship ? 'Play-Offs (3-6)' : 'Europa League (5)'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          <span>{isChampionship ? 'Relegation (22-24)' : 'Relegation (18-20)'}</span>
        </div>
      </div>
    </div>
  );
}
